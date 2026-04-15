using System.ComponentModel.DataAnnotations;


namespace UserService.Data
{
    public class UserProfile
    {
        [Key]
        public Guid Id { get; set; }

        // Foreign identity subject from IdP (sub/oid) — the stable user key
        [Required, MaxLength(200)]
        public string IdentityId { get; set; } = default!;

        [MaxLength(50)]
        public string? Username { get; set; }

        [MaxLength(100)]
        public string? DisplayName { get; set; }

        [MaxLength(100)]
        public string? FirstName { get; set; }

        [MaxLength(100)]
        public string? LastName { get; set; }

        public DateOnly? DateOfBirth { get; set; }

        [MaxLength(320)]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string? Phone { get; set; }

        [MaxLength(512)]
        public string? AvatarUrl { get; set; }

        [MaxLength(300)]
        public string? Bio { get; set; }

        [MaxLength(512)]
        public string? BannerUrl { get; set; }

        public bool IsVendor { get; set; } = false;

        public DateTimeOffset? LastSeen { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}