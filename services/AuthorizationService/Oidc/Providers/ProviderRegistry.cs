namespace AuthorizationService.Oidc;

public interface IProviderRegistry
{
    IProvider? Get(string name);
    IReadOnlyCollection<string> Names { get; }
}

public sealed class ProviderRegistry : IProviderRegistry
{
    private readonly Dictionary<string, IProvider> _providers;

    public ProviderRegistry(IEnumerable<IProvider> providers)
    {
        _providers = providers.ToDictionary(p => p.Name.ToLowerInvariant(), p => p);
    }

    public IProvider? Get(string name)
        => _providers.TryGetValue(name.ToLowerInvariant(), out var p) ? p : null;

    public IReadOnlyCollection<string> Names => _providers.Keys;
}
