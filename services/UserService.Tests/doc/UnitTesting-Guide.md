# Unit Testing Guide (Step-by-Step)

## 1) Unit Test Concepts

- **Unit test**: verifies one small piece of behavior (usually one method).
- **SUT (System Under Test)**: the class/method being tested.
- **AAA pattern**:
  - **Arrange**: prepare inputs and dependencies.
  - **Act**: execute the method.
  - **Assert**: verify result/behavior.
- **Good unit tests are**: fast, isolated, deterministic, readable.

---

## 2) Core Strategies

1. **Test behavior, not implementation**
   - Validate outputs, state changes, and observable effects.
2. **One behavior per test**
   - Keep each test focused and easy to diagnose.
3. **Cover happy path and failure paths**
   - Valid input, invalid input, boundary values, exceptions.
4. **Use clear naming**
   - `MethodName_ExpectedBehavior_WhenCondition`.
5. **Keep setup reusable**
   - Use helper methods (example: `MakeService(...)`).

---

## 3) Common Techniques

- **Boundary testing**: minimum/maximum values.
- **Negative testing**: malformed input, tampered token, expired token.
- **Exception testing**: validate thrown exception type/message.
- **Data setup helpers**: centralize repeated object creation.
- **Fluent assertions**: use readable assertions (`result.Should().BeNull()`).

---

## 4) Step-by-Step: Create a Unit Test

### Step 1: Pick one behavior
Example: `ValidateToken` should return `null` for an expired token.

### Step 2: Arrange
- Create SUT (`JwtTokenService`).
- Prepare test input (claims and expired timestamp).

### Step 3: Act
- Call `CreateToken(...)` then `ValidateToken(...)`.

### Step 4: Assert
- Verify `ValidateToken(...)` result is `null`.

### Step 5: Name test clearly
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`.

---

## 5) Example Patterns from `JwtTokenServiceTests`

- **Claim presence test**
  - `CreateToken_ContainsExpectedClaims`
- **Expired token test**
  - `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- **Tampering test**
  - `ValidateToken_ReturnsNull_WhenSignatureIsTampered`
- **Config/constructor validation**
  - `Constructor_Throws_WhenKeyIsTooShort`

---

## 6) Suggested Checklist for New Tests

- [ ] Test name clearly describes behavior and condition.
- [ ] Uses AAA structure.
- [ ] Asserts exactly what matters.
- [ ] Includes at least one negative case.
- [ ] Avoids dependency on real time/network/database unless required.
- [ ] Test is deterministic and repeatable.

---

## 7) Template for New xUnit Tests

```csharp
[Fact]
public void MethodName_ExpectedBehavior_WhenCondition()
{
    // Arrange
    JwtTokenService sut = MakeService();

    // Act
    ClaimsPrincipal? result = sut.ValidateToken("some-token");

    // Assert
    result.Should().BeNull();
}
```

---

## 8) Practical Expansion Ideas for This Project

1. Add boundary tests around `ClockSkewSeconds`.
2. Add tests for issuer/audience mismatch.
3. Add tests that validate custom claim combinations.
4. Add theory-based tests (`[Theory]`) for multiple malformed token inputs.

---

## 9) Quick Workflow Summary

1. Identify behavior.
2. Write test name.
3. Arrange minimal data.
4. Act once.
5. Assert expected outcome.
6. Run tests and refactor for clarity.
