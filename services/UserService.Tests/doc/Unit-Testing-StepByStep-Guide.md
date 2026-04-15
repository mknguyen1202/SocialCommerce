# Unit Testing in `UserService.Tests` (Step-by-Step Guide)

## 1) What is a unit test?
A unit test verifies one small behavior of one unit (usually one method) in isolation.

Examples:
- A method returns expected data.
- A method throws expected exception.
- A token validator returns `null` for invalid input.

---

## 2) Core concepts

### Arrange / Act / Assert (AAA)
Use this structure in every test:

1. **Arrange**: set up inputs, dependencies, and system under test (SUT).
2. **Act**: execute one behavior.
3. **Assert**: verify expected result.

### Deterministic tests
A test should always produce the same result.
- Avoid real time/network/db in unit tests.
- Inject values (for example, fixed expiry time) instead of relying on current environment.

### One behavior per test
Keep each test focused on one rule. Use clear test names such as:
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- `Constructor_Throws_WhenKeyIsTooShort`

### Fast feedback
Unit tests must be fast. Keep setup minimal and avoid external systems.

---

## 3) Testing strategies

### A) Positive path (happy path)
Verify valid input returns expected output.

Example ideas:
- token contains expected claims
- valid token returns non-null principal

### B) Negative path
Verify invalid input/failure conditions are handled safely.

Example ideas:
- invalid token format returns `null`
- tampered signature returns `null`
- invalid constructor options throw exception

### C) Boundary and edge cases
Test around limits and special boundaries.

Example ideas:
- key length exactly at minimum allowed length
- token with immediate expiry
- empty or null configuration values

### D) Security-oriented checks (important for auth code)
Verify secure failures:
- wrong signing key fails validation
- expired tokens are rejected when lifetime validation is enabled
- malformed input does not crash service

---

## 4) Techniques to write high-quality tests

1. **Use test data builders/factories**
   - Keep reusable helpers (for example `MakeService(...)`) for clean setup.
2. **Use explicit, readable names**
   - Pattern: `Method_ExpectedBehavior_WhenCondition`.
3. **Keep assertions specific**
   - Assert exact claim values, exception type, and key message parts.
4. **Prefer independent tests**
   - Tests should not depend on execution order.
5. **Minimize duplicated setup**
   - Reuse helper methods and constants.

---

## 5) Step-by-step: how to create a new unit test

### Step 1: Identify behavior to verify
Choose one rule from production code.

Example rule:
- "`ValidateToken` should return `null` when audience is wrong."

### Step 2: Name the test clearly
Use behavior-based naming.

Example:
- `ValidateToken_ReturnsNull_WhenAudienceIsWrong`

### Step 3: Arrange test inputs and SUT
- Build `TokenOptions`.
- Create `JwtTokenService`.
- Create token/claims needed for scenario.

### Step 4: Act (single action)
Call the method under test once.

### Step 5: Assert expected outcome
Use `FluentAssertions` to verify outcome exactly.

### Step 6: Run test and check failure clarity
If failing, error should quickly explain what behavior changed.

### Step 7: Refactor test code for readability
- Extract helper methods if setup repeats.
- Keep assertions concise and explicit.

---

## 6) Practical template (`xUnit` + `FluentAssertions`)

```csharp
[Fact]
public void Method_ExpectedResult_WhenCondition()
{
    // Arrange
    JwtTokenService sut = MakeService();
    List<Claim> claims = new List<Claim>
    {
        new Claim("uid", "user-123")
    };

    // Act
    string token = sut.CreateToken(claims);
    ClaimsPrincipal? result = sut.ValidateToken(token);

    // Assert
    result.Should().NotBeNull();
    result!.FindFirstValue("uid").Should().Be("user-123");
}
```

---

## 7) Suggested checklist before merging

- [ ] Test name clearly describes behavior.
- [ ] Test follows AAA structure.
- [ ] Exactly one behavior is validated.
- [ ] Positive/negative/boundary scenarios are covered.
- [ ] Assertions are specific and meaningful.
- [ ] Test does not depend on real external resources.
- [ ] All tests pass locally.

---

## 8) Suggested additional tests for `JwtTokenService`

- `ValidateToken_ReturnsNull_WhenAudienceIsWrong`
- `ValidateToken_ReturnsNull_WhenIssuerIsWrong`
- `CreateToken_IncludesIssuedAtClaim`
- `CreateToken_UsesDefaultAudience_WhenAudienceOverrideIsNull`
- `Constructor_Throws_WhenOptionsAreNull`

---

## 9) Summary
Good unit tests are **small, deterministic, readable, and behavior-focused**. Use clear naming, AAA structure, and strong assertions to maintain confidence during refactoring and releases.
