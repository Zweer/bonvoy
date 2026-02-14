# Testing Strategy

## Test Framework

### Vitest
- All tests use **Vitest** (NOT Jest, Mocha, or others)
- Configuration in `vitest.config.ts` at root
- Run tests: `npm test` (requires `npm run build` first)
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

### Coverage Target
- **100% coverage** — currently achieved, must be maintained
- v8 coverage provider (faster, more accurate than istanbul)
- Coverage includes: statements, branches, functions, lines
- No exceptions — all code must be tested

## Test Structure

### File Organization
```
packages/<name>/
├── src/
│   └── index.ts
└── test/
    ├── index.test.ts        # Main tests
    └── <feature>.test.ts    # Feature-specific tests
```

### Test File Naming
- `<name>.test.ts` for unit tests
- `<name>.e2e.test.ts` for E2E tests
- Match source file name (e.g., `git.ts` → `git.test.ts`)

### Test Structure
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = doSomething(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    // ...
  });

  it('should throw error on invalid input', () => {
    expect(() => doSomething(null)).toThrow('Invalid input');
  });
});
```

## Mocking

### When to Mock
- External APIs (GitHub, GitLab, npm registry)
- File system operations
- Git commands
- Network requests
- Time-dependent operations

### When NOT to Mock
- Internal functions (test the real implementation)
- Simple utilities
- Pure functions

### Mock Patterns

#### Mock with vi.mock()
```typescript
import { vi } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn((cmd, args) => {
    if (cmd === 'git' && args[0] === 'log') {
      return { stdout: 'mock git log output' };
    }
    return { stdout: '' };
  })
}));
```

#### Mock File System with memfs
```typescript
import { vol } from 'memfs';
import { vi } from 'vitest';

vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    '/project/package.json': JSON.stringify({ name: 'test', version: '1.0.0' })
  });
});
```

#### Mock Octokit (GitHub API)
```typescript
const mockOctokit = {
  repos: {
    createRelease: vi.fn().mockResolvedValue({ data: { id: 123 } })
  }
};
```

### Spy on Functions
```typescript
const spy = vi.spyOn(console, 'log');
doSomething();
expect(spy).toHaveBeenCalledWith('expected message');
spy.mockRestore();
```

## Test Types

### Unit Tests
- Test individual functions/classes in isolation
- Mock all external dependencies
- Fast execution (< 1ms per test)
- Example: `packages/core/test/config.test.ts`

### Integration Tests
- Test multiple components together
- Mock only external services (APIs, file system)
- Example: `packages/plugin-git/test/git.test.ts`

### E2E Tests
- Test complete workflows end-to-end
- Located in `e2e/` directory at root
- Mock git, npm, GitHub API (no real operations)
- Example: `e2e/single-package.test.ts`
- See `.kiro/specs/e2e/requirements.md` for 24 scenarios

## Assertions

### Common Patterns
```typescript
// Equality
expect(result).toBe('exact match');
expect(result).toEqual({ key: 'value' }); // deep equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeNull();
expect(result).toBeUndefined();

// Numbers
expect(count).toBeGreaterThan(0);
expect(count).toBeLessThanOrEqual(10);

// Strings
expect(message).toContain('substring');
expect(message).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain('item');

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('specific message');
expect(() => fn()).toThrow(CustomError);

// Async
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

## Test Data

### Fixtures
- Keep test data close to tests
- Use inline data for simple cases
- Extract to separate files for complex data

Example:
```typescript
const mockCommit = {
  hash: 'abc123',
  message: 'feat: add feature',
  author: 'Test Author',
  date: '2026-01-01T00:00:00Z',
  files: ['src/index.ts']
};
```

### Deterministic Data
- Use fixed dates, hashes, IDs (no `Date.now()` or random values)
- Makes tests reproducible
- Example: `2026-01-01T00:00:00Z` instead of `new Date()`

## Best Practices

### Test Naming
- Use `should` or `must` in test names
- Be specific: "should throw error when API key is missing"
- Not: "test error handling"

### One Assertion per Test
- Prefer multiple small tests over one large test
- Makes failures easier to debug
- Exception: related assertions (e.g., object shape)

### Arrange-Act-Assert
```typescript
it('should format version tag', () => {
  // Arrange
  const pkg = { name: '@bonvoy/core', version: '1.0.0' };
  
  // Act
  const tag = formatTag(pkg);
  
  // Assert
  expect(tag).toBe('@bonvoy/core@1.0.0');
});
```

### Avoid Test Interdependence
- Each test must be independent
- No shared state between tests
- Use `beforeEach` for setup, not global variables

### Test Edge Cases
- Empty arrays/strings
- Null/undefined
- Invalid input
- Boundary values (0, -1, max)

### Don't Test Implementation Details
- Test behavior, not internals
- Bad: `expect(obj._privateMethod).toHaveBeenCalled()`
- Good: `expect(obj.publicMethod()).toBe('result')`

## Performance

### Fast Tests
- Unit tests should be < 1ms each
- E2E tests can be slower (< 100ms)
- Use `vi.useFakeTimers()` for time-dependent tests

### Parallel Execution
- Vitest runs tests in parallel by default
- Ensure tests don't conflict (no shared files, ports, etc.)

## Debugging Tests

### Run Single Test
```bash
npm test -- test/specific.test.ts
```

### Run Single Test Case
```typescript
it.only('should test this one', () => {
  // ...
});
```

### Debug Output
```typescript
console.log(JSON.stringify(result, null, 2));
```

### VS Code Debugging
- Use Vitest extension for VS Code
- Set breakpoints in test files
- Run tests in debug mode
