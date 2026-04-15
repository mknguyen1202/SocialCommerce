# Unit Testing Guide (Step-by-Step)

## 1) What a unit test is
A unit test verifies a **small, isolated behavior** in code (usually one method).

- Fast to run
- Deterministic (same input => same output)
- Independent from external systems (DB, network, filesystem)

---

## 2) Core concepts

### 2.1 Arrange-Act-Assert (AAA)
Use this structure in every test:

1. **Arrange**: prepare system under test (SUT), inputs, and dependencies.
2. **Act**: execute one behavior.
3. **Assert**: verify expected outcome.

### 2.2 Test types to include
For each behavior, add tests for:

- **Happy path** (valid input, expected success)
- **Boundary conditions** (min/max/empty values)
- **Negative path** (invalid input, tampered values, wrong state)
- **Error handling** (exceptions/null/failure output)

### 2.3 Good test naming
Use clear names:

`MethodName_ExpectedBehavior_WhenCondition`

Examples:

- `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- `Constructor_Throws_WhenKeyIsTooShort`

---

## 3) Strategies and techniques

### 3.1 Test one behavior per test
Each test should validate a single behavior so failures are easy to diagnose.

### 3.2 Keep tests deterministic
Avoid dependence on current time, random values, or shared mutable state unless explicitly controlled.

### 3.3 Minimize setup noise
Use helper methods (for example `MakeService`) to build repeatable test objects.

### 3.4 Use strong assertions
Prefer expressive assertions (for example `FluentAssertions`) so intent is obvious.

### 3.5 Cover both validity and integrity
For security-related logic (JWT):

- Verify valid claims are present
- Verify expired tokens fail when lifetime validation is enabled
- Verify tampered signatures fail
- Verify different signing keys fail

### 3.6 Prefer in-memory testing for unit tests
Unit tests should avoid integration concerns. Keep cryptography/config/dependency setup in memory unless the goal is integration testing.

---

## 4) Step-by-step: create a new unit test

## Step 1: Identify behavior
Pick one concrete behavior to validate.

Example: `ValidateToken` should return `null` for expired token when `validateLifetime: true`.

## Step 2: Define expected result
Write expected output first.

- Result should be `null`

## Step 3: Prepare inputs and SUT (Arrange)
- Create `JwtTokenService`
- Build required claims
- Create token with past expiration

## Step 4: Execute behavior (Act)
Call target method exactly once.

## Step 5: Verify outcome (Assert)
Assert only what this behavior requires.

## Step 6: Keep test independent
Do not rely on another test’s setup/output.

## Step 7: Repeat for edge and failure cases
Add complementary tests for tampering, bad format, wrong key, and constructor validation.

---

## 5) Example template (xUnit + FluentAssertions)

```csharp
[Fact]
public void MethodName_ExpectedBehavior_WhenCondition()
{
    // Arrange
    JwtTokenService sut = MakeService();

    // Act
    ClaimsPrincipal? result = sut.ValidateToken("not.a.valid.jwt.token");

    // Assert
    result.Should().BeNull();
}
```

---

## 6) Practical checklist before committing tests

- [ ] Test name clearly describes behavior
- [ ] AAA structure is followed
- [ ] Only one behavior is asserted per test
- [ ] Happy path + negative path covered
- [ ] Boundary cases considered
- [ ] No external dependency required
- [ ] Assertions are specific and readable
- [ ] Test passes consistently on repeated runs

---

## 7) Suggested coverage areas for `JwtTokenService`

1. Constructor validation
   - Empty key
   - Too-short key
2. Token creation
   - Claims preserved (`uid`, `permission`)
   - Audience override works
3. Token validation
   - Valid token returns principal
   - Expired token returns `null` when lifetime validation is on
   - Expired token allowed when lifetime validation is off
   - Tampered token returns `null`
   - Invalid format returns `null`
   - Token signed with different key returns `null`

---

## 8) When to move beyond unit tests
Use integration tests when validating:

- Real authentication middleware pipeline
- Real key storage/configuration sources
- Cross-service token exchange behavior

Unit tests should still remain the first fast feedback layer.
