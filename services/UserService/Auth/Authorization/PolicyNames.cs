namespace UserService.Auth.Authorization;

public static class PolicyNames
{
    // Permissions
    public const string UserRead = "user.read";
    public const string UserWrite = "user.write";

    // Add more as you grow:
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";
    public const string AdminOnly = "admin.only";
}
