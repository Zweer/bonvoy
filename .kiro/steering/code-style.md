# Code Style & Best Practices

## TypeScript

### Strict Mode
- Always use strict mode (enabled in `tsconfig.json`)
- No `any` types — use `unknown` or proper types
- Explicit return types on all exported functions
- Explicit parameter types always

### Module System
- ES modules only (`"type": "module"` in package.json)
- Use `.js` extensions in imports (TypeScript requirement for ES modules)
- Example: `import { foo } from './bar.js'` (not `./bar` or `./bar.ts`)

### Naming Conventions
- **camelCase** for variables, functions, methods
- **PascalCase** for classes, interfaces, types
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names

### Code Organization
```typescript
// 1. Imports (external first, then internal)
import { execa } from 'execa';
import type { Context } from '@bonvoy/core';

// 2. Types/Interfaces
export interface MyConfig {
  option: string;
}

// 3. Constants
const DEFAULT_TIMEOUT = 5000;

// 4. Classes/Functions
export class MyClass {
  // ...
}
```

### Type Definitions
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, intersections, mapped types
- Export all public types
- Use `readonly` for immutable properties

Example:
```typescript
export interface PluginConfig {
  readonly name: string;
  options?: Record<string, unknown>;
}

export type SemverBump = 'major' | 'minor' | 'patch';
```

## Code Quality

### Linting & Formatting
- **Biome** for linting and formatting (NOT ESLint/Prettier)
- Single quotes for strings
- 100 character line width
- No semicolons (Biome default)
- Run `npm run lint` before committing

### Minimal Code
- Write only what's necessary
- No premature abstractions
- No unused code or imports
- No commented-out code in commits

### Error Handling
- Always throw typed errors with clear messages
- Include context in error messages
- Use `try/catch` for async operations
- Example:
```typescript
if (!config.apiKey) {
  throw new Error('API key is required. Set GITHUB_TOKEN environment variable.');
}
```

### Async/Await
- Prefer `async/await` over `.then()/.catch()`
- Always handle errors in async functions
- Use `Promise.all()` for parallel operations

## Dependencies

### Minimal Dependencies
- Only add dependencies when absolutely necessary
- Prefer native Node.js APIs when possible
- No duplicate functionality (e.g., don't add lodash if we have native methods)

### Key Dependencies
- `tapable` — Hook system (core architecture)
- `semver` — Version manipulation
- `execa` — Command execution
- `zod` — Config validation
- `cosmiconfig` + `jiti` — Config loading
- `@octokit/rest` — GitHub API

### Version Pinning
- Use `^` for dependencies (allow minor/patch updates)
- Use exact versions only for critical dependencies
- **CRITICAL**: Keep dependencies up to date — always use latest stable versions
- Run `npm outdated` regularly and update
- Security updates must be applied immediately

## File Structure

### Package Layout
```
packages/<name>/
├── src/
│   ├── index.ts          # Main entry, re-exports
│   ├── <name>.ts         # Main implementation
│   └── types.ts          # Type definitions (if many)
├── test/
│   ├── index.test.ts     # Main tests
│   └── <feature>.test.ts # Feature-specific tests
├── package.json
├── README.md
└── CHANGELOG.md
```

### Exports
- Always export from `src/index.ts`
- Keep `src/index.ts` minimal (re-exports only)
- Example:
```typescript
// src/index.ts
export { MyPlugin } from './my-plugin.js';
export type { MyPluginConfig } from './types.js';
```

## Comments & Documentation

### When to Comment
- Complex algorithms or non-obvious logic
- Public APIs (JSDoc)
- Workarounds or hacks (with explanation)

### When NOT to Comment
- Obvious code (`// increment counter` for `i++`)
- Redundant information
- Commented-out code (delete it)

### JSDoc
Use JSDoc for public APIs:
```typescript
/**
 * Generate changelog from commits.
 * 
 * @param commits - Array of parsed commits
 * @param config - Changelog configuration
 * @returns Formatted changelog string
 */
export function generateChangelog(
  commits: Commit[],
  config: ChangelogConfig
): string {
  // ...
}
```

## Performance

### Avoid Premature Optimization
- Write clear code first
- Optimize only when needed (profiling shows bottleneck)
- Prefer readability over micro-optimizations

### Common Patterns
- Use `Set` for unique values, not `Array.filter()`
- Use `Map` for key-value lookups, not objects
- Cache expensive computations
- Avoid nested loops when possible

## Security

### No Secrets in Code
- Never commit API keys, tokens, passwords
- Use environment variables
- Document required env vars in README

### Input Validation
- Validate all external input (config, CLI args, API responses)
- Use Zod schemas for validation
- Sanitize file paths (no `../` traversal)

### Dependencies
- Run `npm audit` regularly
- Update dependencies with security fixes immediately
- Review dependency changes in PRs
