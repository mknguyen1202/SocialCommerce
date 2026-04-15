# Unit Testing Guide (Step-by-Step)

This guide explains core unit testing concepts, practical strategies, and techniques, then shows how to create unit tests in this solution (`.NET 8`, `C# 12`, `xUnit`, `FluentAssertions`).

---

## 1) What a Unit Test Is

A unit test verifies one small behavior of one unit (usually a class/method) in isolation.

### Goal
- Confirm correct behavior for valid input.
- Confirm safe behavior for invalid input.
- Protect against regressions.

### Good unit test characteristics
- **Fast**
- **Deterministic** (same result every run)
- **Isolated** (no real DB/network/time dependency unless controlled)
- **Readable** (clear intent from test name)

---

## 2) Core Concepts

### 2.1 Arrange-Act-Assert (AAA)
Most tests should follow:
1. **Arrange**: build SUT + inputs
2. **Act**: execute behavior
3. **Assert**: verify outcome

### 2.2 SUT (System Under Test)
The class/method being tested.

### 2.3 Test Doubles
Use mocks/fakes/stubs to isolate dependencies.

### 2.4 Deterministic Inputs
Avoid random values, current time, and shared mutable state unless controlled.

---

## 3) Unit Test Strategies

### Strategy A: Happy-path testing
Verify expected output when input is valid.

### Strategy B: Boundary testing
Test limits and edges:
- empty strings
- minimum/maximum values
- null or missing values

### Strategy C: Negative/error-path testing
Verify behavior for invalid input and exceptions.

### Strategy D: Security/robustness testing
For auth/token code, test:
- expired token rejection
- tampered signature rejection
- wrong signing key rejection

### Strategy E: Configuration testing
Verify constructor/config validation (invalid key lengths, empty config).

---

## 4) Techniques for High-Quality Tests

1. **Use descriptive names**
   - Pattern: `Method_Condition_ExpectedResult`
   - Example: `ValidateToken_ReturnsNull_WhenTokenIsExpired`

2. **One behavior per test**
   - Keep each test focused and small.

3. **Prefer explicit assertions**
   - Assert specific claim/value/error message when useful.

4. **Avoid over-mocking**
   - Mock only external dependencies.

5. **Keep test data local and obvious**
   - Inline simple values.
   - Use helper methods only for repeated setup.

6. **Test both success and failure paths**
   - Do not stop at happy path.

---

## 5) Step-by-Step: How to Create a Unit Test

## Step 1: Identify behavior
Choose one concrete behavior, for example:
- token contains expected claims
- invalid token format returns null

## Step 2: Name the test clearly
Use: `Method_Condition_ExpectedResult`.

## Step 3: Arrange
Create SUT and input data.

## Step 4: Act
Call the target method.

## Step 5: Assert
Verify expected result only.

## Step 6: Add edge/error tests
After happy path, add boundary and negative tests.

## Step 7: Refactor test setup
If repeated setup appears, move it to helper methods.

---

## 6) Example Pattern (xUnit + FluentAssertions)

```csharp
[Fact]
public void Method_Condition_ExpectedResult()
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

## 7) Applying This to `JwtTokenService`

Current test coverage already demonstrates strong baseline strategy:
- claims round-trip validation
- expired token behavior (`validateLifetime: true` vs `false`)
- tampered signature handling
- invalid format handling
- constructor validation (short/empty key)
- issuer/validator key mismatch handling

Recommended additional cases:
1. Missing required claim scenarios.
2. Audience mismatch explicit rejection test.
3. Issuer mismatch explicit rejection test.
4. Clock skew behavior (if non-zero skew is configured).

---

## 8) Practical Checklist for New Tests

Before merging, confirm:
- [ ] Test name clearly states behavior.
- [ ] AAA structure is obvious.
- [ ] Only one behavior is asserted.
- [ ] Success and failure paths are both covered.
- [ ] No flaky dependency (time/network/shared state).
- [ ] Assertions are meaningful and specific.

---

## 9) Suggested Workflow for This Repository

1. Add/adjust tests under `services/UserService.Tests/Unit/`.
2. Run tests locally.
3. Fix failures before changing production code where possible.
4. Keep tests readable and deterministic.
5. Update this doc if a new testing pattern is introduced.

---

## 10) Quick Template for New Test Cases

```csharp
[Fact]
public void <Method>_<Condition>_<ExpectedResult>()
{
    // Arrange
    // Create SUT
    // Prepare inputs

    // Act
    // Call method

    // Assert
    // Verify result
}
```
