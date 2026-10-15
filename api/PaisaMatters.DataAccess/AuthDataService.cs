using System.Data;
using Microsoft.Data.SqlClient;
using PaisaMatters.Common;
using PaisaMatters.DomainModel;
using PaisaMatters.ServiceInterface;

namespace PaisaMatters.DataAccess;

public sealed class AuthDataService(string connectionString) : IAuthDataService
{
    private readonly string _connectionString = connectionString;

    public async Task<Guid?> RegisterAsync(string name, string email, string hash, CancellationToken token)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(token);
        await using var command = new SqlCommand(Procedures.CreateLoginAccount, connection) { CommandType = CommandType.StoredProcedure };
        command.Parameters.Add("@Action", SqlDbType.NVarChar, 10).Value = "SIGNUP";
        command.Parameters.Add("@FullName", SqlDbType.NVarChar, 150).Value = name;
        command.Parameters.Add("@Email", SqlDbType.NVarChar, 256).Value = email;
        command.Parameters.Add("@PasswordHash", SqlDbType.NVarChar, 500).Value = hash;
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
        await using var command = new SqlCommand("SELECT FullName, Email, IsActive FROM dbo.Users WHERE UserId=@id", connection);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        string name, email;
        await using (var reader = await command.ExecuteReaderAsync(token))
        {
            if (!await reader.ReadAsync(token) || !reader.GetBoolean(2)) return null;
            name = reader.GetString(0); email = reader.GetString(1);
        }
        return new UserProfile(id, name, email, await GetRolesAsync(connection, id, token));
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
