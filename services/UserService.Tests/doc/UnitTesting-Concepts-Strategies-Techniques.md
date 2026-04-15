# Unit Testing Guide (Concepts, Strategies, Techniques, and Steps)

## 1) What is a Unit Test?
A unit test verifies one small piece of behavior (a "unit") in isolation.

- **Unit**: usually a single method or class.
- **Goal**: validate behavior quickly and reliably.
- **Result**: confidence that refactoring and changes do not break existing logic.

---

## 2) Core Concepts

### 2.1 Arrange-Act-Assert (AAA)
Use this structure for every test:

1. **Arrange**: set up objects, inputs, and dependencies.
2. **Act**: execute the method under test.
3. **Assert**: verify output, state, or side effects.

### 2.2 Test Naming
Use clear names with expected behavior:

- `MethodName_ExpectedBehavior_WhenCondition`
- Example: `ValidateToken_ReturnsNull_WhenTokenIsExpired`

### 2.3 Determinism
Tests should always produce the same result when run repeatedly.

- Avoid real clock/network/file-system dependencies unless intentionally covered.
- Control time-sensitive inputs explicitly.

### 2.4 Isolation
A unit test should focus only on one unit.

- Replace external collaborators (DB, HTTP, queues) with fakes/mocks/stubs.
- Keep tests small and independent.

---

## 3) Testing Strategies

### 3.1 Happy Path + Negative Path
For each feature, test both:

- **Happy path**: expected valid behavior.
- **Negative path**: invalid input, failures, edge cases.

### 3.2 Boundary Testing
Verify behavior at limits:

- min/max values,
- empty/null inputs,
- expired timestamps,
- malformed data.

### 3.3 Behavioral Coverage, not Line Coverage
Focus on critical behaviors and business rules first:

- security logic,
- validation,
- authorization,
- error handling.

### 3.4 Keep Tests Fast
Fast tests run more often and give better feedback.

- Prefer in-memory setup.
- Avoid unnecessary integration dependencies in unit tests.

---

## 4) Useful Techniques

### 4.1 Parameterized Tests
Use `[Theory]` with `[InlineData]` for similar scenarios.

### 4.2 Explicit Assertions
Use expressive assertions with `FluentAssertions`:

- `result.Should().BeNull();`
- `principal.Should().NotBeNull();`

### 4.3 Test Data Builders / Helpers
Create helper methods for repeated setup (example: `MakeService(...)`).

### 4.4 One Assertion Theme per Test
A test can have multiple assertions, but they should verify one behavior theme.

### 4.5 Test Failures Should be Actionable
If a test fails, the cause should be easy to identify from the name and assertions.

---

## 5) Step-by-Step: How to Create Unit Tests

## Step 1: Identify the Unit and Behavior
Choose one method and define what it must do.

Example targets for `JwtTokenService`:

- create token with expected claims,
- reject tampered signature,
- return null for expired token (when lifetime validation enabled).

## Step 2: List Test Scenarios
For each behavior, write scenarios before coding:

1. valid claims are preserved,
2. expired token is rejected,
3. invalid token format is rejected,
4. short key throws exception.

## Step 3: Prepare a Test Fixture
Create a helper to construct a consistent SUT (System Under Test).

```csharp
private static JwtTokenService MakeService(string key = "test-secret-key-min-32-bytes-long!!")
{
    TokenOptions options = new TokenOptions
    {
        SymmetricKey = key,
        Issuer = "TestIssuer",
        Audience = "TestAudience",
        AccessTokenMinutes = 15,
        ClockSkewSeconds = 0
    };

    return new JwtTokenService(options);
}
```

## Step 4: Write the First Test with AAA

```csharp
[Fact]
public void ValidateToken_ReturnsNull_WhenTokenIsInvalidFormat()
{
    JwtTokenService sut = MakeService();

    ClaimsPrincipal? result = sut.ValidateToken("not.a.valid.jwt.token");

    result.Should().BeNull();
}
```

## Step 5: Add Negative and Edge Cases
Add tests for:

- expiration,
- tampering,
- wrong signing key,
- invalid configuration.

## Step 6: Refactor Test Code
Improve readability and remove duplication:

- extract helper methods,
- use clear test names,
- keep each test focused.

## Step 7: Run Tests Frequently
Run test suite after each small change and before commit.

## Step 8: Review Quality Checklist
Before finishing, confirm each test is:

- deterministic,
- isolated,
- readable,
- meaningful (protects behavior that matters).

---

## 6) Practical Checklist for New Unit Tests

- [ ] Test name follows `Method_Expected_WhenCondition`
- [ ] Uses clear AAA structure
- [ ] Covers happy path and negative path
- [ ] Covers boundary/edge cases
- [ ] Avoids external dependency side effects
- [ ] Uses explicit assertions
- [ ] Runs fast and independently

---

## 7) Example Test Suite Coverage Map (`JwtTokenService`)

Your current suite already demonstrates strong patterns:

- claim preservation (`CreateToken_ContainsExpectedClaims`)
- expiry handling (`ValidateToken_ReturnsNull_WhenTokenIsExpired`)
- tamper detection (`ValidateToken_ReturnsNull_WhenSignatureIsTampered`)
- invalid format handling (`ValidateToken_ReturnsNull_WhenTokenIsInvalidFormat`)
- constructor guard clauses (`Constructor_Throws_WhenKeyIsTooShort`, `Constructor_Throws_WhenKeyIsEmpty`)
- key mismatch rejection (`ValidateToken_ReturnsNull_WhenIssuedByDifferentKey`)

This is a good baseline for secure unit testing of authentication/token services.
