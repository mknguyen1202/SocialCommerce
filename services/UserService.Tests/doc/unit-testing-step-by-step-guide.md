# Unit Testing Guide (Step-by-Step)

This guide explains concepts, strategies, and techniques for writing unit tests in `UserService.Tests`.

## 1) What a Unit Test Is

A unit test verifies one small behavior of one unit (usually one method) in isolation.

A good unit test is:
- **Fast**
- **Deterministic** (same input, same output)
- **Independent** (does not depend on other tests)
- **Focused** (tests one behavior)

---

## 2) Core Concepts

### Arrange-Act-Assert (AAA)
Use this structure in every test:
1. **Arrange**: Prepare inputs, test data, and the system under test.
2. **Act**: Execute one action.
3. **Assert**: Verify expected result.

### Test Naming
Use descriptive names with expected behavior, for example:
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- `CreateToken_ContainsExpectedClaims`

### System Under Test (SUT)
The class or method being verified.
- Example: `JwtTokenService sut = MakeService();`

---

## 3) Test Design Strategies

### A) Happy Path Tests
Verify expected valid behavior.
- Example: token is created and contains expected claims.

### B) Negative Tests
Verify invalid input or failure behavior.
- Expired token returns `null`
- Tampered token returns `null`
- Invalid token format returns `null`

### C) Boundary Tests
Verify edge values and limits.
- Key too short should throw.
- Empty key should throw.

### D) Security-Critical Behavior Tests
For auth/token code, always test:
- Signature tampering
- Lifetime validation on/off
- Wrong signing key
- Audience/issuer validation assumptions

---

## 4) Practical Techniques

### Keep Test Data Explicit
Prefer explicit values over random values so failures are easy to diagnose.

### Use Small Helper Methods
Create small setup helpers to reduce duplication.
- Example: `MakeService(string key = "...")`

### Verify One Behavior per Test
Each test should fail for one reason only.

### Assert Precisely
Use precise assertions:
- `Should().BeNull()`
- `Should().NotBeNull()`
- `FindFirstValue("uid").Should().Be("user-123")`

### Cover Exception Paths
Use `Action` and assert exact exception type/message when useful.

---

## 5) Step-by-Step: How to Create a New Unit Test

### Step 1: Choose One Behavior
Pick one behavior of one method.

Example behavior:
- "`ValidateToken` returns `null` for expired token when lifetime validation is enabled."

### Step 2: Write the Test Name
Follow pattern:
- `MethodName_ExpectedResult_WhenCondition`

Example:
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`

### Step 3: Arrange
- Create SUT.
- Prepare input data.
- Prepare edge condition.

### Step 4: Act
Call exactly one method under test.

### Step 5: Assert
Verify outcome exactly matches expectation.

### Step 6: Run Test and Confirm Failure/Pass
- If writing TDD: first see it fail, then implement/fix code.
- Re-run until pass.

### Step 7: Refactor Test (If Needed)
- Remove duplication.
- Keep readability high.
- Preserve behavior coverage.

---

## 6) Example Test Template (xUnit + FluentAssertions)

```csharp
[Fact]
public void Method_ExpectedResult_WhenCondition()
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

## 7) Example Checklist Before Committing

- [ ] Test name is behavior-based and clear.
- [ ] Uses Arrange-Act-Assert.
- [ ] Tests only one behavior.
- [ ] Assertions are specific.
- [ ] Includes both happy and negative paths for critical logic.
- [ ] No hidden dependencies between tests.
- [ ] Runs consistently locally.

---

## 8) Suggested Additional Tests for `JwtTokenService`

- Token with missing required claim behavior.
- Token with mismatched issuer behavior.
- Token with mismatched audience behavior.
- Validation with non-zero clock skew behavior.
- Null/empty token input behavior.

---

## 9) Quick Pattern for This Project

1. Create or reuse helper setup (`MakeService`).
2. Add a focused `[Fact]` method in `JwtTokenServiceTests`.
3. Follow AAA strictly.
4. Use `FluentAssertions` for readable verification.
5. Run tests and ensure deterministic pass.

This process keeps tests maintainable, secure, and easy to understand.