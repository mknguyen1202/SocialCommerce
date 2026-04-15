using SocialContentService.Data;

namespace SocialContentService.Dtos
{
    public record CreateCommentDto(string Text, Guid? ParentId = null);
    public record UpdateCommentDto(string Text);

    public record CommentReadDto(
        Guid Id,
        Guid PostId,
        Guid AuthorUserId,
        Guid? ParentId,
        string Text,
        short Depth,
        int Upvotes,
        int Downvotes,
        int ReplyCount,
        DateTimeOffset CreatedAt,
        DateTimeOffset? EditedAt,
        bool IsDeleted);

    public static class CommentMapping
    {
        public static CommentReadDto ToRead(this Comment c) => new(
            c.Id, c.PostId, c.AuthorUserId, c.ParentId, c.Text,
            c.Depth, c.Upvotes, c.Downvotes, c.ReplyCount,
            c.CreatedAt, c.EditedAt, c.DeletedAt.HasValue);
    }
}