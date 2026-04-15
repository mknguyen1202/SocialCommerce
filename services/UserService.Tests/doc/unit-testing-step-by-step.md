# Unit Testing Guide (Step-by-Step)

This guide explains practical concepts, strategies, and techniques for writing maintainable unit tests in `UserService.Tests`.

---

## 1) Unit Test Concepts

- **Unit test**: verifies one small behavior of one unit (usually one method).
- **SUT (System Under Test)**: the class/method being tested.
- **Isolation**: test only one behavior at a time.
- **Deterministic result**: same input should always produce same output.
- **Fast feedback**: unit tests should run quickly and independently.

---

## 2) Testing Strategy

Use the following strategy for every test file:

1. **Choose one class** to test (example: `JwtTokenService`).
2. **List behaviors** (success + failure + edge cases).
3. **Group tests by behavior** using clear test names.
4. **Use AAA pattern** in each test:
   - Arrange
   - Act
   - Assert
5. **Keep one assertion focus per test** (or one closely related assertion set).
6. **Cover negative cases** (invalid input, expired token, tampered token, wrong key).
7. **Keep test setup reusable** (factory/helper methods).

---

## 3) Techniques to Use

### 3.1 Naming Technique
Use: `MethodName_ExpectedBehavior_WhenCondition`

Examples:
- `ValidateToken_ReturnsNull_WhenTokenIsExpired`
- `Constructor_Throws_WhenKeyIsTooShort`

### 3.2 AAA Technique
Use explicit sections in test methods:

```csharp
[Fact]
public void ValidateToken_ReturnsNull_WhenTokenIsInvalidFormat()
{
    // Arrange
    JwtTokenService sut = MakeService();

    // Act
    ClaimsPrincipal? result = sut.ValidateToken("not.a.valid.jwt.token");

    // Assert
    result.Should().BeNull();
}
```

### 3.3 Boundary and Edge Testing
Always include:
- minimum valid values
- invalid/empty values
- expired timestamps
- tampered data
- key mismatch

### 3.4 Security-Oriented Testing
For auth/token logic, verify:
- signature validation
- expiry enforcement
- issuer/audience validation (if enabled)
- malformed token handling

### 3.5 Exception Testing
When invalid config/input is expected:

```csharp
[Fact]
public void Constructor_Throws_WhenKeyIsEmpty()
{
    // Arrange
    TokenOptions options = new TokenOptions { SymmetricKey = "" };

    // Act
    Action act = () => new JwtTokenService(options);

    // Assert
    act.Should().Throw<InvalidOperationException>();
}
```

---

## 4) Step-by-Step: How to Create a New Unit Test

### Step 1: Pick a behavior
Example: "Token validation returns null when signature is tampered."

### Step 2: Create the test method with clear name

```csharp
[Fact]
public void ValidateToken_ReturnsNull_WhenSignatureIsTampered()
{
}
```

### Step 3: Arrange test data
- Build SUT with helper (`MakeService`).
- Create a valid token.
- Corrupt/tamper token string.

### Step 4: Act
- Call the method under test (`ValidateToken`).

### Step 5: Assert expected result
- Expect `null` for invalid token.

### Step 6: Keep it isolated
- Do not depend on external network, DB, file system, or current environment state.

### Step 7: Run tests
Run all tests in `UserService.Tests` and ensure no flaky behavior.

---

## 5) Recommended Test Coverage Checklist

For each public method, add tests for:

- [ ] Happy path (valid input)
- [ ] Invalid input format
- [ ] Null/empty input where applicable
- [ ] Boundary values
- [ ] Security-related failure modes
- [ ] Exception paths
- [ ] Optional parameter behaviors

---

## 6) Template for New Tests

```csharp
[Fact]
public void Method_ExpectedResult_WhenCondition()
{
    // Arrange
    // Build SUT
    // Create input

    // Act
    // Call method under test

    // Assert
    // Verify output/exception/state
}
```

---

## 7) Quality Rules for This Project

- Use explicit types in C# (do not use `var`).
- Keep test names descriptive and behavior-focused.
- Prefer small, focused tests over large scenario tests.
- Keep helper methods simple and reusable.

---

## 8) Practical Example Set (JwtTokenService)

A solid baseline already includes tests for:
- expected claims persistence
- expired token behavior
- tampered signature behavior
- invalid format behavior
- constructor guard clauses
- audience override behavior
- wrong signing key behavior

Use these as reference patterns when adding new tests.
