# Unit Testing: Concepts, Strategies, Techniques, and Step-by-Step Guide

## 1) Purpose of Unit Tests
Unit tests verify that a **single unit of behavior** (usually one method) works correctly and predictably.

Goals:
- Catch regressions early.
- Document expected behavior.
- Enable safe refactoring.
- Increase confidence in releases.

---

## 2) Core Concepts

### Unit
A small, isolated behavior (for example, `JwtTokenService.ValidateToken`).

### Isolation
The test should focus on one unit. External dependencies should be controlled (mocked/faked/stubbed) when needed.

### Deterministic Result
Given the same input, the test should always produce the same output.

### AAA Pattern
Use the same structure in every test:
1. **Arrange**: Build test data and system-under-test.
2. **Act**: Execute one action.
3. **Assert**: Verify expected outcome.

---

## 3) Test Strategies

### A. Happy Path Testing
Validate expected behavior for valid input.
- Example: token contains expected claims.

### B. Edge Case Testing
Validate behavior at boundaries.
- Example: expiration time around current UTC time.

### C. Negative Testing
Validate failure scenarios.
- Example: invalid token format, tampered signature, wrong key.

### D. Security-Focused Testing
For auth/security code, include tests for:
- Signature tampering.
- Key mismatch.
- Expiration/lifetime validation.
- Audience and issuer validation.

### E. Fast and Small Tests
Keep tests independent, quick, and narrowly focused.

---

## 4) Practical Techniques

### Naming Convention
Use descriptive format:
- `MethodName_Condition_ExpectedResult`

Examples:
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- `CreateToken_ContainsExpectedClaims`

### One Behavior per Test
Each test should validate one behavior only.

### Explicit Test Data
Use explicit values for clarity (`"user-123"`, `"permission"`, etc.).

### Time Control
When testing expiration, pass explicit timestamps (`DateTimeOffset.UtcNow.AddSeconds(-10)`).

### Stable Assertions
Use clear assertions (`Should().BeNull()`, `Should().NotBeNull()`, exact claim checks).

---

## 5) Step-by-Step: How to Create Unit Tests

## Step 1: Identify the Unit and Behaviors
List public methods and expected outcomes.

For `JwtTokenService`, examples include:
- `CreateToken` should include supplied claims.
- `ValidateToken` should reject expired tokens.
- Constructor should reject invalid keys.

## Step 2: List Test Scenarios
Create a scenario table before coding.

| Category | Scenario | Expected Result |
|---|---|---|
| Happy path | Valid claims in token | Claims are present after validation |
| Negative | Tampered token | Validation returns `null` |
| Negative | Invalid format token | Validation returns `null` |
| Edge | Expired token with lifetime check | Validation returns `null` |
| Edge | Expired token without lifetime check | Validation succeeds |
| Config validation | Short/empty key | Constructor throws exception |

## Step 3: Build Shared Test Setup
Create helper factory method for repeated setup.

Example pattern:
- `MakeService(string key = "...")` that returns configured `JwtTokenService`.

## Step 4: Implement Tests Using AAA
For each scenario:
1. Arrange inputs and service.
2. Act by calling method under test.
3. Assert expected output/exception.

## Step 5: Keep Tests Independent
No test should depend on another test’s output or execution order.

## Step 6: Run Tests Frequently
Run tests after each small change.

## Step 7: Refine for Readability
Improve names and remove duplication without reducing clarity.

---

## 6) Minimal xUnit + FluentAssertions Template

```csharp
using FluentAssertions;
using Xunit;

namespace UserService.Tests.Unit;

public class SampleTests
{
    [Fact]
    public void Method_Condition_ExpectedResult()
    {
        // Arrange
        SampleService sut = new SampleService();

        // Act
        string result = sut.DoWork("input");

        // Assert
        result.Should().Be("expected");
    }
}
```

---

## 7) Example Mapping to Existing `JwtTokenServiceTests`
Current tests already cover strong baseline areas:
- Claims correctness.
- Expired tokens (with and without lifetime validation).
- Tampered signatures.
- Invalid token format.
- Invalid key configuration.
- Different signing key validation failure.

Potential additions:
- Explicit issuer mismatch test.
- Explicit audience mismatch test.
- Null/empty claims collection behavior.
- Clock skew tolerance behavior if non-zero skew is allowed.

---

## 8) Unit Test Quality Checklist
Use this checklist before merging:
- [ ] Test name explains behavior clearly.
- [ ] Test follows Arrange-Act-Assert.
- [ ] Exactly one behavior is validated.
- [ ] Assertions are specific and stable.
- [ ] Positive + negative + edge cases exist.
- [ ] Security-sensitive paths are covered.
- [ ] Tests are deterministic and independent.
- [ ] Tests are fast.

---

## 9) Quick Workflow for New Tests
1. Pick one method.
2. Define behavior list.
3. Write scenario table.
4. Add happy path tests.
5. Add negative and edge tests.
6. Add exception/config tests.
7. Run and refine.
8. Commit with clear test-focused message.
