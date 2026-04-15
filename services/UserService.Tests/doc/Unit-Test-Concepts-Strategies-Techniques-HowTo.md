# Unit Testing Step-by-Step Guide (.NET 8, C# 12)

This document explains core **concepts**, practical **strategies**, and hands-on **techniques** for creating maintainable unit tests in `UserService.Tests`.

---

## 1) What a Unit Test Is

A unit test validates one small behavior of one unit (usually one class method) in isolation.

Good unit tests are:
- **Fast**
- **Deterministic** (same input => same result)
- **Focused** (one behavior per test)
- **Readable** (clear intent)

---

## 2) Test Design Concepts

### 2.1 AAA Pattern (Arrange, Act, Assert)
- **Arrange**: Prepare input, dependencies, and system under test.
- **Act**: Execute one action.
- **Assert**: Verify exactly what should happen.

### 2.2 First-Class Test Names
Use naming that explains behavior:
- `MethodName_ExpectedBehavior_WhenCondition`

Examples:
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- `Constructor_Throws_WhenKeyIsTooShort`

### 2.3 Single Responsibility Per Test
Each test should validate one behavior only. If one test checks multiple behaviors, split it.

---

## 3) Testing Strategies

### 3.1 Happy Path + Guard Path
For each method, write tests for:
1. **Valid input** (happy path)
2. **Invalid/edge input** (guard path)
3. **Security-sensitive path** (if relevant)

For JWT-related code:
- Valid token should parse and expose claims.
- Expired token should fail (when lifetime validation is on).
- Tampered signature should fail.
- Wrong signing key should fail.

### 3.2 Boundary Testing
Focus on boundary values:
- Time boundaries (`expires` in past/future)
- Min key length (>= 256-bit requirement)
- Empty/null values

### 3.3 Negative Testing
Verify incorrect inputs fail safely:
- Invalid token format
- Wrong key
- Missing required options

---

## 4) Practical Techniques in This Project

### 4.1 Use a Factory/Helper for Test Setup
A helper like `MakeService(...)` avoids duplication and keeps test setup consistent.

### 4.2 Keep Inputs Explicit
Use explicit types for readability and consistency.

### 4.3 Use `FluentAssertions`
Readable assertions improve maintenance:
- `principal.Should().NotBeNull();`
- `act.Should().Throw<InvalidOperationException>();`

### 4.4 Test Security Behaviors Explicitly
For auth/token logic, include explicit tests for:
- Tampering
- Lifetime validation on/off
- Issuer key mismatch

---

## 5) Step-by-Step: How to Create a New Unit Test

### Step 1: Pick one behavior
Example behavior: “Token should include `uid` claim.”

### Step 2: Create test name
`CreateToken_ContainsUidClaim_WhenClaimProvided`

### Step 3: Arrange
- Build `JwtTokenService`
- Prepare claims input

### Step 4: Act
- Create token
- Validate token

### Step 5: Assert
- Principal is not null
- `uid` claim value is expected

### Step 6: Keep it focused
Do not also validate unrelated claims in the same test unless behavior requires it.

### Step 7: Run tests and refactor
If test passes, review readability and remove duplication (without weakening assertions).

---

## 6) Template You Can Reuse

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
    ClaimsPrincipal? principal = sut.ValidateToken(token);

    // Assert
    principal.Should().NotBeNull();
    principal!.FindFirstValue("uid").Should().Be("user-123");
}
```

---

## 7) Suggested Test Checklist

Before finalizing a test, confirm:
- [ ] Name describes behavior clearly
- [ ] Uses AAA structure
- [ ] Verifies only one behavior
- [ ] Covers positive or negative path intentionally
- [ ] Assertions are precise
- [ ] No fragile dependencies on external systems

---

## 8) Common Mistakes to Avoid

- Testing multiple unrelated behaviors in one test
- Weak assertions (`NotBeNull` only, no value checks)
- Random/non-deterministic inputs
- Over-mocking simple logic classes
- Ignoring exception and failure paths

---

## 9) Next Tests to Add for `JwtTokenService`

Potential additions:
1. `CreateToken_UsesConfiguredIssuer_WhenNoOverrideProvided`
2. `CreateToken_UsesConfiguredAudience_WhenNoOverrideProvided`
3. `ValidateToken_ReturnsNull_WhenAudienceDoesNotMatch`
4. `ValidateToken_ReturnsNull_WhenIssuerDoesNotMatch`
5. `CreateToken_AcceptsMultipleClaimsWithSameType`

---

## 10) Recommended Workflow

1. Add one new test.
2. Run tests.
3. Refactor setup if needed.
4. Add next test.
5. Repeat in small increments.

This keeps failures easy to diagnose and maintains test quality over time.
