using System.Data;
using Microsoft.Data.SqlClient;
using PaisaMatters.Common;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.DataAccess;

public sealed class AuthDataService(string connectionString) : IAuthDataService
{
    private readonly string _connectionString = connectionString;

    public Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token) =>
        RegisterAsync(name, email, hash, null, token);

    public async Task<Guid?> RegisterAsync(string name, string email, string hash, string? upiId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.CreateLoginAccount, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@Action", SqlDbType.NVarChar, 10).Value = "SIGNUP";
        command.Parameters.Add("@FullName", SqlDbType.NVarChar, 150).Value = name;
        command.Parameters.Add("@Email", SqlDbType.NVarChar, 256).Value = email;
        command.Parameters.Add("@PasswordHash", SqlDbType.NVarChar, 500).Value = hash;
        command.Parameters.Add("@UPIId", SqlDbType.NVarChar, 100).Value = string.IsNullOrWhiteSpace(upiId) ? DBNull.Value : upiId.Trim();
        var output = command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier); output.Direction = ParameterDirection.Output;
        await using (var reader = await command.ExecuteReaderAsync(token))
            while (await reader.ReadAsync(token))
                if (reader.FieldCount > 0 && reader.GetValue(0) is string result && result.Contains("DUPLICATE", StringComparison.OrdinalIgnoreCase)) return null;
        return output.Value is Guid id && id != Guid.Empty ? id : throw new InvalidOperationException("Registration did not return an account identifier.");
    }

    public async Task<LoginRecord?> FindLoginAsync(string email, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.CreateLoginAccount, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@Action", SqlDbType.NVarChar, 10).Value = "LOGIN";
        command.Parameters.Add("@FullName", SqlDbType.NVarChar, 150).Value = DBNull.Value;
        command.Parameters.Add("@Email", SqlDbType.NVarChar, 256).Value = email;
        command.Parameters.Add("@PasswordHash", SqlDbType.NVarChar, 500).Value = DBNull.Value;
        command.Parameters.Add("@UPIId", SqlDbType.NVarChar, 100).Value = DBNull.Value;
        var output = command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier); output.Direction = ParameterDirection.Output;
        LoginRecord? record = null;
        await using (var reader = await command.ExecuteReaderAsync(token))
            if (await reader.ReadAsync(token))
                record = new LoginRecord(reader.GetGuid(reader.GetOrdinal("UserId")), reader.GetString(reader.GetOrdinal("FullName")), reader.GetString(reader.GetOrdinal("Email")), reader.GetString(reader.GetOrdinal("PasswordHash")), reader.GetBoolean(reader.GetOrdinal("IsActive")));
        return record;
    }

    public async Task<UserProfile?> GetProfileAsync(Guid id, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand("SELECT FullName, Email, IsActive, UPIId FROM dbo.Users WHERE UserId=@id", connection);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        string name, email;
        string? upiId = null;
        await using (var reader = await command.ExecuteReaderAsync(token))
        {
            if (!await reader.ReadAsync(token) || !reader.GetBoolean(2)) return null;
            name = reader.GetString(0);
            email = reader.GetString(1);
            if (!reader.IsDBNull(3)) upiId = reader.GetString(3);
        }
        return new UserProfile(id, name, email, await GetRolesAsync(connection, id, token), upiId);
    }

    public async Task<UserProfile?> UpdateProfileAsync(Guid id, string fullName, string? upiId, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.UpdateUserProfile, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = id;
        command.Parameters.Add("@FullName", SqlDbType.NVarChar, 150).Value = fullName;
        command.Parameters.Add("@UPIId", SqlDbType.NVarChar, 100).Value = string.IsNullOrWhiteSpace(upiId) ? DBNull.Value : upiId.Trim();

        string name, email;
        string? savedUpi = null;
        await using (var reader = await command.ExecuteReaderAsync(token))
        {
            if (!await reader.ReadAsync(token)) return null;
            name = reader.GetString(reader.GetOrdinal("FullName"));
            email = reader.GetString(reader.GetOrdinal("Email"));
            var upiOrdinal = reader.GetOrdinal("UPIId");
            if (!reader.IsDBNull(upiOrdinal)) savedUpi = reader.GetString(upiOrdinal);
        }

        var roles = await GetRolesAsync(connection, id, token);
        return new UserProfile(id, name, email, roles, savedUpi);
    }

    public async Task<(string? FullName, string? Email, string? PasswordHash, bool IsActive)?> GetUserCredentialsAsync(Guid id, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand("SELECT FullName, Email, PasswordHash, IsActive FROM dbo.Users WHERE UserId=@id", connection);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        await using var reader = await command.ExecuteReaderAsync(token);
        if (!await reader.ReadAsync(token)) return null;
        return (reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetBoolean(3));
    }

    public async Task<bool> UpdatePasswordHashAsync(Guid id, string newHash, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand("UPDATE dbo.Users SET PasswordHash=@hash, UpdatedAt=SYSUTCDATETIME() WHERE UserId=@id AND IsActive=1", connection);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        command.Parameters.Add("@hash", SqlDbType.NVarChar, 500).Value = newHash;
        var rows = await command.ExecuteNonQueryAsync(token);
        return rows > 0;
    }

    private static async Task<IReadOnlyList<string>> GetRolesAsync(SqlConnection connection, Guid id, CancellationToken token)
    {
        await using var command = new SqlCommand("SELECT r.RoleName FROM dbo.UserRoles ur INNER JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE ur.UserId=@id", connection);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        var roles = new List<string>(); await using var reader = await command.ExecuteReaderAsync(token);
        while (await reader.ReadAsync(token)) roles.Add(reader.GetString(0));
        return roles;
    }

    public async Task<IReadOnlyList<string>> GetRolesForUserAsync(Guid id, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString); await connection.OpenAsync(token);
        return await GetRolesAsync(connection, id, token);
    }
}
