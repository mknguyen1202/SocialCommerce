# StreamingService — Unit Test Documentation

## Overview

This document describes the unit tests for **StreamingService**, the co-watching theater platform
that handles theater lifecycle management, participant coordination, live chat, playback
synchronisation, and emote management.

### Test project

| Property | Value |
|---|---|
| Project file | `services/StreamingService.Tests/StreamingService.Tests.csproj` |
| Target framework | .NET 9 |
| Test framework | xUnit 2.x |
| Assertion library | FluentAssertions 6.x |
| Mocking library | Moq 4.x |
| Database | EF Core InMemory (isolated per test via `Guid.NewGuid()` database name) |

### Test classes

| Class | File | Tests |
|---|---|---|
| `TheatersControllerTests` | `Unit/TheatersControllerTests.cs` | 30 |
| `EmotesControllerTests` | `Unit/EmotesControllerTests.cs` | 6 |

---

## Infrastructure & Shared Helpers

Both test classes follow the same setup pattern.

### Database isolation

Each test class constructor creates a fresh `AppDbContext` backed by a uniquely-named
EF Core InMemory database, so no state leaks between tests:

```csharp
DbContextOptions<AppDbContext> options = new DbContextOptionsBuilder<AppDbContext>()
    .UseInMemoryDatabase(Guid.NewGuid().ToString())
    .Options;
_db = new AppDbContext(options);
```

`IDisposable.Dispose()` disposes the context after every test.

### User identity injection

Controllers read the caller's identity from the `"uid"` JWT claim. Both test classes
provide a `MakeController(Guid userId)` helper that wires up a `ClaimsPrincipal`
directly on the controller's `HttpContext`, bypassing the authentication middleware:

```csharp
ClaimsIdentity identity = new ClaimsIdentity([new Claim("uid", userId.ToString())], "test");
controller.ControllerContext = new ControllerContext
{
    HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
};
```

### `TheatersControllerTests` — additional helpers

| Helper | Purpose |
|---|---|
| `MakeCreateDto(title, scheduledAt)` | Builds a `CreateTheaterDto` with sensible defaults for creation tests |
| `SeedTheater(hostId, status, visibility)` | Persists a `Theater`, its host `TheaterParticipant`, and an initial `PlaybackState` to the in-memory database, returning the saved entity |
| `Mock<IRealTimePublisher> _rt` | Shared mock used across all lifecycle, participant, playback, and chat tests to assert that real-time events are published correctly |

---

## `TheatersControllerTests`

Tests for `TheatersController` (`POST/GET/PATCH /theaters`, `/theaters/{id}/start`, etc.).

### Create

| Test | Scenario | Expected |
|---|---|---|
| `Create_ReturnsCreatedWithTheaterDto` | Happy path — no `ScheduledAt` | `201 Created` with correct `Title`, `HostId`, `Status = "created"`, `Visibility = "public"` |
| `Create_WithScheduledAt_SetsStatusToScheduled` | `ScheduledAt` is provided | `Status = "scheduled"` and `ScheduledAt` is not null |
| `Create_AddsHostParticipantAndPlaybackState` | Side effects of creation | A `TheaterParticipant` with `Role = "host"` and a `PlaybackState` with `IsPlaying = false` are written to the database |

### Get

| Test | Scenario | Expected |
|---|---|---|
| `Get_ExistingTheater_ReturnsOk` | Theater exists | `200 OK` with matching `Id` |
| `Get_NonExistentTheater_ReturnsNotFound` | Unknown `theaterId` | `404 Not Found` |

### Update

| Test | Scenario | Expected |
|---|---|---|
| `Update_AsHost_AppliesPartialUpdate` | Host sends a new `Title` | `200 OK` with updated title persisted |
| `Update_AsNonHost_ReturnsForbid` | Non-host user calls `PATCH` | `403 Forbid` |
| `Update_NonExistentTheater_ReturnsNotFound` | Unknown `theaterId` | `404 Not Found` |

### Theater lifecycle state machine

The theater status follows this one-way flow:

```
created ──┐
          ├──► live ──► paused ──► live   (cycle)
scheduled ┘              │
                         └──────────────► ended
```

<h4>Start (<code>POST /theaters/{id}/star</code>)</h4>

| Test | Scenario | Expected |
|---|---|---|
| `Start_FromValidStatus_TransitionsToLive` (`"created"`, `"scheduled"`) | Host starts from an allowed status | `200 OK`, `Status = "live"`, `StartedAt` is set |
| `Start_PublishesStatusEvent` | Successful start | `IRealTimePublisher.PublishAsync` called once with event `"theater:status"` on `"theater:{id}"` |
| `Start_FromInvalidStatus_ReturnsConflict` (`"live"`, `"paused"`, `"ended"`) | Invalid transition | `409 Conflict` |
| `Start_AsNonHost_ReturnsForbid` | Non-host caller | `403 Forbid` |

#### Pause (`POST /theaters/{id}/pause`)

| Test | Scenario | Expected |
|---|---|---|
| `Pause_FromLive_TransitionsToPaused` | Theater is `"live"` | `200 OK`, `Status = "paused"` |
| `Pause_FromNonLiveStatus_ReturnsConflict` (`"created"`, `"paused"`, `"ended"`) | Invalid transition | `409 Conflict` |

#### Resume (`POST /theaters/{id}/resume`)

| Test | Scenario | Expected |
|---|---|---|
| `Resume_FromPaused_TransitionsToLive` | Theater is `"paused"` | `200 OK`, `Status = "live"` |
| `Resume_FromLive_ReturnsConflict` | Theater is already `"live"` | `409 Conflict` |

#### End (`POST /theaters/{id}/end`)

| Test | Scenario | Expected |
|---|---|---|
| `End_FromValidStatus_TransitionsToEnded` (`"live"`, `"paused"`) | Host ends from an allowed status | `200 OK`, `Status = "ended"`, `EndedAt` is set |
| `End_FromInvalidStatus_ReturnsConflict` (`"created"`, `"scheduled"`, `"ended"`) | Invalid transition | `409 Conflict` |

### Participants

#### Join (`POST /theaters/{id}/join`)

| Test | Scenario | Expected |
|---|---|---|
| `Join_NewParticipant_IncrementsViewerCount` | First-time viewer joins | `200 OK`, `Role = "viewer"`, `ViewerCount` incremented to `1` |
| `Join_ExistingParticipant_RejoinsWithoutIncrementingCount` | Viewer who previously left re-joins | `LeftAt` cleared, `ViewerCount` remains unchanged |
| `Join_EndedTheater_ReturnsConflict` | Theater status is `"ended"` | `409 Conflict` |
| `Join_PublishesViewerEvents` | Successful join | `"theater:viewer_joined"` and `"theater:viewer_count"` each published once |

#### Leave (`POST /theaters/{id}/leave`)

| Test | Scenario | Expected |
|---|---|---|
| `Leave_ActiveParticipant_DecrementsViewerCount` | Viewer leaves an active theater | `204 No Content`, `ViewerCount` decremented |
| `Leave_NonParticipant_ReturnsNotFound` | User was never a participant | `404 Not Found` |

#### Mute Chat (`POST /theaters/{id}/participants/{targetUserId}/mute-chat`)

| Test | Scenario | Expected |
|---|---|---|
| `MuteChat_AsHost_MutesTarget` | Host mutes a viewer | `204 No Content`, `IsChatMuted = true` persisted |
| `MuteChat_AsViewer_ReturnsForbid` | Viewer attempts to mute another viewer | `403 Forbid` |

### Playback

#### Get Playback (`GET /theaters/{id}/playback`)

| Test | Scenario | Expected |
|---|---|---|
| `GetPlayback_ExistingState_ReturnsOk` | Playback state exists (seeded by `SeedTheater`) | `200 OK` with correct `TheaterId` and `IsPlaying = false` |

#### Update Playback (`PUT /theaters/{id}/playback`)

| Test | Scenario | Expected |
|---|---|---|
| `UpdatePlayback_AsHost_UpdatesAndPublishes` | Host sets position and play state | `200 OK` with updated values, `"theater:playback_sync"` published once |
| `UpdatePlayback_AsNonHost_ReturnsForbid` | Non-host caller | `403 Forbid` |

### Chat

#### Send Chat (`POST /theaters/{id}/chat`)

| Test | Scenario | Expected |
|---|---|---|
| `SendChat_AsActiveParticipant_ReturnsMessageAndPublishes` | Unmuted participant sends a message | `200 OK` with correct `Content` and `SenderId`, `"theater:chat_message"` published |
| `SendChat_WhenMuted_ReturnsForbid` | Participant has `IsChatMuted = true` | `403 Forbid` |
| `SendChat_NonParticipant_ReturnsForbid` | User is not a participant | `403 Forbid` |

#### Delete Chat (`DELETE /theaters/{id}/chat/{messageId}`)

| Test | Scenario | Expected |
|---|---|---|
| `DeleteChat_AsSender_SoftDeletesMessage` | Author deletes their own message | `204 No Content`, `IsDeleted = true` persisted |
| `DeleteChat_AsHost_CanDeleteOtherUsersMessage` | Host deletes any message | `204 No Content` |
| `DeleteChat_AsOtherViewer_ReturnsForbid` | Viewer tries to delete another user's message | `403 Forbid` |

### Invite (`POST /theaters/{id}/invite`)

| Test | Scenario | Expected |
|---|---|---|
| `Invite_PublishesToTargetUser` | Host sends an invite | `204 No Content`, `"theater:invite"` published to `"user:{inviteeId}"` once |

---

## `EmotesControllerTests`

Tests for `EmotesController` (`GET /emotes`, `GET /theaters/{id}/emotes`,
`POST /theaters/{id}/emotes`).

### Infrastructure

`EmotesController` has no `IRealTimePublisher` dependency, so no mock is needed.
`MakeController(Guid userId)` and a lightweight `SeedTheater(Guid hostId)` helper
(no participants or playback state required) are the only shared utilities.

### Global Emotes (`GET /emotes`)

| Test | Scenario | Expected |
|---|---|---|
| `GetGlobal_ReturnsOnlyGlobalEmotes` | Database contains 2 global and 1 theater-scoped emote | `200 OK`, list of 2 items all with `Category = "global"` |

### Theater Emotes (`GET /theaters/{id}/emotes`)

| Test | Scenario | Expected |
|---|---|---|
| `GetTheaterEmotes_ReturnsOnlyTheaterScopedEmotes` | Theater has 1 scoped emote; 1 global emote also in database | `200 OK`, list of 1 item with `Code = ":hype:"` |
| `GetTheaterEmotes_NonExistentTheater_ReturnsNotFound` | Unknown `theaterId` | `404 Not Found` |

### Create Theater Emote (`POST /theaters/{id}/emotes`)

| Test | Scenario | Expected |
|---|---|---|
| `CreateTheaterEmote_AsHost_CreatesEmote` | Host creates an emote | `200 OK` with `Code`, `Category = "theater"`, correct `TheaterId` and `CreatedBy` |
| `CreateTheaterEmote_AsNonHost_ReturnsForbid` | Non-host caller | `403 Forbid` |
| `CreateTheaterEmote_NonExistentTheater_ReturnsNotFound` | Unknown `theaterId` | `404 Not Found` |

---

## Authorization matrix

| Action | Viewer | Moderator | Host | Notes |
|---|---|---|---|---|
| Create theater | ✅ | ✅ | ✅ | Any authenticated user |
| Update theater metadata | ❌ | ❌ | ✅ | |
| Start / Pause / Resume / End | ❌ | ❌ | ✅ | |
| Join theater | ✅ | ✅ | ✅ | Blocked if theater is `"ended"` |
| Leave theater | ✅ | ✅ | ✅ | |
| Mute chat participant | ❌ | ✅ | ✅ | |
| Update playback | ❌ | ❌ | ✅ | |
| Send chat message | ✅* | ✅* | ✅* | *Blocked if `IsChatMuted = true` |
| Delete own chat message | ✅ | ✅ | ✅ | |
| Delete any chat message | ❌ | ✅ | ✅ | |
| Invite users | ✅ | ✅ | ✅ | Any participant |
| Create theater emote | ❌ | ❌ | ✅ | |
