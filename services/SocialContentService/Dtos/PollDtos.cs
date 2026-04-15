namespace SocialContentService.Dtos
{
    public record CreatePollDto(DateTimeOffset? EndsAt, IEnumerable<string> Options);
    public record CastPollVoteDto(Guid OptionId);
    public record PollOptionReadDto(Guid Id, string Label, int Votes, int DisplayOrder);
    public record PollReadDto(Guid Id, Guid PostId, int TotalVotes, DateTimeOffset? EndsAt, IEnumerable<PollOptionReadDto> Options);
}
