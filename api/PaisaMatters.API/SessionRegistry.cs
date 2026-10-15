using System.Collections.Concurrent;

namespace PaisaMatters.API;

public sealed class SessionRegistry
{
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> _sessions = new();
    public Guid Create() { var id = Guid.NewGuid(); _sessions[id] = DateTimeOffset.UtcNow.AddHours(12); return id; }
    public bool IsValid(Guid id) { if (!_sessions.TryGetValue(id, out var expires)) return false; if (expires > DateTimeOffset.UtcNow) return true; _sessions.TryRemove(id, out _); return false; }
    public void Revoke(Guid id) => _sessions.TryRemove(id, out _);
}
