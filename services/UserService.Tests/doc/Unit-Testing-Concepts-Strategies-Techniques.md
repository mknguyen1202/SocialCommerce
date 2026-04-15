# Unit Testing Concepts, Strategies, and Techniques (`UserService.Tests`)

This guide explains **step-by-step** how to design and create high-quality unit tests in this project.

---

## 1. Core concepts

### 1.1 What is a unit test?
A unit test verifies one small behavior (usually one method) in isolation.

A good unit test is:
- Fast
- Deterministic
- Independent from external systems (database, HTTP, file system)

### 1.2 System Under Test (SUT)
The SUT is the class/method being tested.

Example in this project:
- SUT: `JwtTokenService`
- Test class: `JwtTokenServiceTests`

### 1.3 AAA pattern (Arrange, Act, Assert)
Use this structure in every test:
1. **Arrange**: Prepare SUT, inputs, and dependencies.
2. **Act**: Execute one behavior.
3. **Assert**: Verify one expected outcome.

---

## 2. Testing strategies

### 2.1 Happy path strategy
Validate expected behavior for valid input.

Example:
- `CreateToken_ContainsExpectedClaims`

### 2.2 Negative path strategy
Validate safe failures for invalid input.

Examples:
- `ValidateToken_ReturnsNull_WhenSignatureIsTampered`
- `ValidateToken_ReturnsNull_WhenTokenIsInvalidFormat`

### 2.3 Boundary strategy
Validate behavior at limits.

Examples:
- Constructor key too short
- Token expiration at/near current time

### 2.4 Security-focused strategy
For auth code, verify both validity and integrity:
- Wrong key should fail validation
- Expired token should fail when lifetime validation is enabled
- Tampered token should fail

---

## 3. Techniques for maintainable tests

1. **Use explicit naming**
   - Pattern: `Method_ExpectedBehavior_WhenCondition`
2. **One behavior per test**
   - Easier diagnosis when a test fails
3. **Reusable setup helper**
   - Example: `MakeService(...)` to reduce duplication
4. **Readable assertions**
   - Use `FluentAssertions` for clarity
5. **No shared mutable state**
   - Keep tests independent and order-agnostic

---

## 4. Step-by-step: how to create a new unit test

### Step 1: Select one behavior
Pick one concrete behavior from production code.

Example behavior:
- `ValidateToken` returns `null` when issuer is invalid.

### Step 2: Write the test name
Use behavior-based naming.

Example:
- `ValidateToken_ReturnsNull_WhenIssuerIsWrong`

### Step 3: Arrange
- Create `TokenOptions`
- Create SUT (`JwtTokenService`)
- Prepare claims/token for the scenario

### Step 4: Act
Call target method once.

### Step 5: Assert
Check exact expected outcome (`null`, claim value, exception, etc.).

### Step 6: Add complementary cases
After first test passes, add adjacent scenarios:
- valid case
- invalid case
- boundary case

### Step 7: Refactor test setup (if needed)
Extract helper methods/constants to keep tests concise.

---

## 5. Practical test template (`xUnit` + `FluentAssertions`)

```csharp
[Fact]
public void Method_ExpectedBehavior_WhenCondition()
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

## 6. Suggested workflow for this repository

1. Open target test file in `services/UserService.Tests/Unit/`
2. Add test method using AAA
3. Run tests for `UserService.Tests`
4. Fix failures and improve assertion clarity
5. Commit when tests are stable and readable

---

## 7. Quality checklist before merge

- [ ] Test name is clear and behavior-focused
- [ ] AAA structure is used
- [ ] Only one behavior is validated
- [ ] Positive/negative/boundary cases are covered
- [ ] Assertions are precise and readable
- [ ] Test is deterministic and independent

---

## 8. Example next tests for `JwtTokenService`

- `ValidateToken_ReturnsNull_WhenIssuerIsWrong`
- `ValidateToken_ReturnsNull_WhenAudienceIsWrong`
- `Constructor_Throws_WhenOptionsAreNull`
- `CreateToken_UsesDefaultAudience_WhenAudienceOverrideIsNull`
