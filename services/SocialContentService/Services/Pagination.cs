namespace SocialContentService.Services
{
    public static class Cursor
    {
        public static string Encode(DateTimeOffset t) => Convert.ToBase64String(BitConverter.GetBytes(t.ToUnixTimeMilliseconds()));
        public static DateTimeOffset? Decode(string? c)
        {
            if (string.IsNullOrWhiteSpace(c)) return null;
            try { long ms = BitConverter.ToInt64(Convert.FromBase64String(c)); return DateTimeOffset.FromUnixTimeMilliseconds(ms); }
            catch { return null; }
        }
    }
}