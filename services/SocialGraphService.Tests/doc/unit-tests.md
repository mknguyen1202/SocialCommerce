# SocialGraphService Unit Tests

## Overview

| Property | Value |
|---|---|
| **Test project** | `SocialGraphService.Tests` |
| **Target framework** | .NET 9 |
| **Test file** | `Unit/GraphControllerTests.cs` |
| **Class under test** | `GraphController` |
| **Test framework** | xUnit |
| **Assertion library** | FluentAssertions 6 |
| **Mocking library** | Moq 4 |
| **Database** | EF Core InMemory |
| **Total tests** | 53 |

---

## Test Fixture

`GraphControllerTests` implements `IDisposable`. Each test gets an isolated in-memory `AppDb` instance (keyed by a fresh `Guid`), a `Mock<IBusPublisher>`, and a `NullLogger<GraphController>`.

### Seed Helpers

| Helper | Description |
|---|---|
| `SeedFollow(follower, followee, createdAt?)` | Inserts a `Follow` row and clears the change tracker |
| `SeedBlock(blocker, blocked)` | Inserts a `Block` row and clears the change tracker |
| `SeedFriendRequest(sender, receiver, status?)` | Inserts a `FriendRequest` row (default status `"pending"`) and clears the change tracker |

---

## Test Groups

### Follow — 5 tests

Tests for `GraphController.Follow(userId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Follow_NoBlock_ReturnsNoContent` | No block in either direction | `204 NoContent` |
| `Follow_NoBlock_PersistsFollowRow` | No block in either direction | `Follows` table contains the new row |
| `Follow_NoBlock_PublishesUserFollowedEvent` | No block in either direction | `IBusPublisher.PublishAsync("user.followed", …)` called once |
| `Follow_BlockedByMe_ReturnsForbid` | Caller has blocked the target | `403 Forbid` |
| `Follow_BlockedByOther_ReturnsForbid` | Target has blocked the caller | `403 Forbid` |

---

### Unfollow — 3 tests

Tests for `GraphController.Unfollow(userId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Unfollow_FollowExists_RemovesRowAndReturnsNoContent` | Follow row exists | Row deleted; `204 NoContent` |
| `Unfollow_FollowExists_PublishesUserUnfollowedEvent` | Follow row exists | `IBusPublisher.PublishAsync("user.unfollowed", …)` called once |
| `Unfollow_FollowDoesNotExist_ReturnsNoContentWithoutPublishing` | No follow row | `204 NoContent`; no bus publish |

---

### Block — 4 tests

Tests for `GraphController.Block(userId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Block_NoExistingBlock_ReturnsNoContent` | No prior block | `204 NoContent` |
| `Block_NoExistingBlock_PersistsBlockRow` | No prior block | `Blocks` table contains the new row |
| `Block_NoExistingBlock_PublishesUserBlockedEvent` | No prior block | `IBusPublisher.PublishAsync("user.blocked", …)` called once |
| `Block_ExistingFollowsBothWays_RemovesBothFollows` | Both users follow each other | Both follow rows are deleted |

---

### Unblock — 3 tests

Tests for `GraphController.Unblock(userId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Unblock_BlockExists_RemovesRowAndReturnsNoContent` | Block row exists | Row deleted; `204 NoContent` |
| `Unblock_BlockExists_PublishesUserUnblockedEvent` | Block row exists | `IBusPublisher.PublishAsync("user.unblocked", …)` called once |
| `Unblock_BlockDoesNotExist_ReturnsNoContentWithoutPublishing` | No block row | `204 NoContent`; no bus publish |

---

### Following — 4 tests

Tests for `GraphController.Following(userId, cursor, take, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Following_NoFollows_ReturnsEmptyPage` | User follows nobody | `200 OK`; empty `Items`; `null` `NextCursor` |
| `Following_HasFollows_ReturnsFolloweeIds` | User follows two users | `200 OK`; `Items` contains both followee IDs |
| `Following_MoreItemsThanTake_SetsNextCursorAndTruncatesPage` | 3 rows, `take=2` | `Items` has 2 entries; `NextCursor` is not null |
| `Following_UseCursor_ReturnsNextPage` | 4 rows, `take=2`; second page via cursor | Second page returns only the remaining item; `NextCursor` is null |

---

### Followers — 2 tests

Tests for `GraphController.Followers(userId, cursor, take, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Followers_HasFollowers_ReturnsFollowerIds` | Two users follow the target | `200 OK`; `Items` contains both follower IDs |
| `Followers_DoesNotReturnFollowees` | Target follows another user (not followed back) | `200 OK`; `Items` is empty |

---

### Blocks — 3 tests

Tests for `GraphController.Blocks(userId, direction, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Blocks_DirectionOut_ReturnsOutboundBlocks` | `direction="out"`; user has blocked one person | `200 OK`; `{ blocks: [blockedId] }` |
| `Blocks_DirectionIn_ReturnsInboundBlockedBy` | `direction="in"`; user is blocked by one person | `200 OK`; `{ blockedBy: [blockerId] }` |
| `Blocks_DirectionBoth_ReturnsBothDirections` | `direction="both"`; one outbound + one inbound block | `200 OK`; both `blocks` and `blockedBy` arrays populated |

---

### Rel — 4 tests

Tests for `GraphController.Rel(me, other, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Rel_NoRelationship_AllFlagsFalse` | No follow or block in either direction | `IsFollowing=false`, `IsBlockedByMe=false`, `HasBlockedMe=false` |
| `Rel_IsFollowing_ReturnsTrueIsFollowing` | Caller follows target | `IsFollowing=true`; block flags false |
| `Rel_BlockedByMe_ReturnsTrueIsBlockedByMeOnly` | Caller has blocked target | `IsBlockedByMe=true`; `HasBlockedMe=false` |
| `Rel_BlockedByOther_ReturnsTrueHasBlockedMeOnly` | Target has blocked caller | `HasBlockedMe=true`; `IsBlockedByMe=false` |

---

### Friends — 2 tests

Tests for `GraphController.Friends(me, cursor, take, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `Friends_MutualFollow_ReturnsFriendId` | Both users follow each other | `200 OK`; `Items` contains the mutual friend's ID |
| `Friends_OneWayFollow_ReturnsEmpty` | Only the caller follows the other | `200 OK`; `Items` is empty |

---

### IncomingFriendRequests — 3 tests

Tests for `GraphController.IncomingFriendRequests(me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `IncomingFriendRequests_PendingRequest_ReturnsRequest` | A `pending` request addressed to the caller exists | `200 OK`; returns DTO with correct `Id`, `SenderId`, `ReceiverId`, and `Status="pending"` |
| `IncomingFriendRequests_AcceptedRequest_IsNotReturned` | Request is in `accepted` state | `200 OK`; empty collection |
| `IncomingFriendRequests_RequestSentByMe_IsNotReturned` | Request was sent by the caller, not received | `200 OK`; empty collection |

---

### SendFriendRequest — 6 tests

Tests for `GraphController.SendFriendRequest(userId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `SendFriendRequest_ToSelf_ReturnsBadRequest` | `me == userId` | `400 BadRequest` |
| `SendFriendRequest_BlockedByMe_ReturnsForbid` | Caller has blocked the recipient | `403 Forbid` |
| `SendFriendRequest_BlockedByOther_ReturnsForbid` | Recipient has blocked the caller | `403 Forbid` |
| `SendFriendRequest_DuplicateRequest_ReturnsConflict` | A pending request already exists | `409 Conflict` |
| `SendFriendRequest_Valid_ReturnsCreatedWithMappedDto` | No blocks or duplicates | `201 Created`; DTO has correct `SenderId`, `ReceiverId`, `Status="pending"` |
| `SendFriendRequest_Valid_PublishesFriendRequestSentEvent` | No blocks or duplicates | `IBusPublisher.PublishAsync("friend.request.sent", …)` called once |

---

### AcceptFriendRequest — 7 tests

Tests for `GraphController.AcceptFriendRequest(requestId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `AcceptFriendRequest_ValidRequest_ReturnsNoContent` | Caller is the receiver; request is pending | `204 NoContent` |
| `AcceptFriendRequest_ValidRequest_UpdatesStatusToAccepted` | Caller is the receiver; request is pending | `Status` column updated to `"accepted"` |
| `AcceptFriendRequest_ValidRequest_CreatesMutualFollows` | Caller is the receiver; request is pending | Both follow rows created in `Follows` table |
| `AcceptFriendRequest_ValidRequest_PublishesFriendRequestAcceptedEvent` | Caller is the receiver; request is pending | `IBusPublisher.PublishAsync("friend.request.accepted", …)` called once |
| `AcceptFriendRequest_NotTheReceiver_ReturnsNotFound` | Request exists but is addressed to a different user | `404 NotFound` |
| `AcceptFriendRequest_AlreadyAccepted_ReturnsConflict` | Request is already in `accepted` state | `409 Conflict` |
| `AcceptFriendRequest_RequestNotFound_ReturnsNotFound` | Request ID does not exist | `404 NotFound` |

---

### DeclineFriendRequest — 5 tests

Tests for `GraphController.DeclineFriendRequest(requestId, me, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `DeclineFriendRequest_ValidRequest_ReturnsNoContent` | Caller is the receiver; request is pending | `204 NoContent` |
| `DeclineFriendRequest_ValidRequest_UpdatesStatusToDeclined` | Caller is the receiver; request is pending | `Status` column updated to `"declined"` |
| `DeclineFriendRequest_NotTheReceiver_ReturnsNotFound` | Request exists but is addressed to a different user | `404 NotFound` |
| `DeclineFriendRequest_AlreadyDeclined_ReturnsConflict` | Request is already in `declined` state | `409 Conflict` |
| `DeclineFriendRequest_RequestNotFound_ReturnsNotFound` | Request ID does not exist | `404 NotFound` |

---

### BulkIsFollowing — 2 tests

Tests for `GraphController.BulkIsFollowing(dto, ct)`.

| Test | Scenario | Expected result |
|---|---|---|
| `BulkIsFollowing_SomeFollowed_ReturnsTrueForFollowedAndFalseForRest` | Caller follows one of two supplied IDs | `200 OK`; `Results[followedId]=true`, `Results[notFollowedId]=false` |
| `BulkIsFollowing_EmptyFolloweeList_ReturnsEmptyResults` | Empty followee ID list supplied | `200 OK`; `Results` dictionary is empty |

---

## Test Count Summary

| Group | Count |
|---|---|
| Follow | 5 |
| Unfollow | 3 |
| Block | 4 |
| Unblock | 3 |
| Following | 4 |
| Followers | 2 |
| Blocks | 3 |
| Rel | 4 |
| Friends | 2 |
| IncomingFriendRequests | 3 |
| SendFriendRequest | 6 |
| AcceptFriendRequest | 7 |
| DeclineFriendRequest | 5 |
| BulkIsFollowing | 2 |
| **Total** | **53** |
