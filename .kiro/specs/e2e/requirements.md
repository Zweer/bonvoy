# bonvoy E2E Test Requirements

> End-to-end test scenarios for bonvoy CLI with mocked git and filesystem

## Test Strategy

- **No real git repos**: Mock `execa` for git commands
- **No real filesystem**: Mock `fs` for package.json reading
- **Isolated scenarios**: Each test is independent
- **Predictable output**: Deterministic commit hashes and dates

## Core Scenarios

### 1. Single Package - First Release

**Setup:**
```
package.json: { name: "test-pkg", version: "0.0.0" }
No workspaces
No git tags
```

**Commits:**
- `feat: add authentication`
- `fix: resolve memory leak`
- `docs: update README`

**Expected:**
- Version: `0.0.0` → `0.1.0` (minor bump from feat)
- Changelog includes: feat, fix (no docs)
- 1 package to release

---

### 2. Monorepo - Independent Versioning

**Setup:**
```
Workspaces: @test/core, @test/utils, @test/cli
Versions: 1.0.0, 0.5.0, 0.2.0
Last tag: @test/core@1.0.0
```

**Commits:**
- `feat: add new API` (files: `packages/core/src/api.ts`)
- `fix: helper bug` (files: `packages/utils/src/helper.ts`)
- `docs: update readme` (files: `README.md`)

**Expected:**
- `@test/core`: `1.0.0` → `1.1.0` (minor)
- `@test/utils`: `0.5.0` → `0.5.1` (patch)
- `@test/cli`: no changes
- 2 packages to release

---

### 3. Breaking Change - Major Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.5.2" }
```

**Commits:**
- `feat!: remove deprecated API`

**Expected:**
- Version: `1.5.2` → `2.0.0` (major)
- Changelog section: "💥 Breaking Changes"

---

### 4. No Semantic Commits

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
```

**Commits:**
- `chore: update dependencies`
- `style: format code`
- `docs: fix typo`

**Expected:**
- No version bump
- No packages to release
- Output: "No packages to release"

---

### 5. Force Version Override

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
CLI args: shipit 2.5.0
```

**Commits:**
- `feat: new feature`

**Expected:**
- Version: `1.0.0` → `2.5.0` (forced, ignores conventional)
- Changelog still generated from commits

---

### 6. Multi-Package Commit

**Setup:**
```
Workspaces: @test/core, @test/utils
Versions: 1.0.0, 1.0.0
```

**Commits:**
- `feat: shared types` (files: `packages/core/src/types.ts`, `packages/utils/src/types.ts`)

**Expected:**
- Both packages: `1.0.0` → `1.1.0`
- Same commit appears in both changelogs

---

### 7. Dry Run Mode

**Setup:**
```
Any scenario
CLI args: shipit --dry-run
```

**Expected:**
- No filesystem writes
- No git commands executed (commit, tag, push)
- Output shows what would happen
- Exit code 0

---

## Pre-1.0.0 Version Scenarios

### 8. Pre-1.0 - Fix Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "0.5.0" }
```

**Commits:**
- `fix: resolve bug`

**Expected:**
- Version: `0.5.0` → `0.5.1` (patch)

---

### 9. Pre-1.0 - Feat Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "0.5.0" }
```

**Commits:**
- `feat: add feature`

**Expected:**
- Version: `0.5.0` → `0.6.0` (minor)

---

### 10. Pre-1.0 - Breaking Change

**Setup:**
```
package.json: { name: "test-pkg", version: "0.5.0" }
```

**Commits:**
- `feat!: breaking change`

**Expected:**
- Version: `0.5.0` → `1.0.0` (major, graduates to 1.0)

---

### 11. Pre-1.0 - Perf Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "0.5.0" }
```

**Commits:**
- `perf: optimize queries`

**Expected:**
- Version: `0.5.0` → `0.5.1` (patch, perf = patch)

---

## Post-1.0.0 Version Scenarios

### 12. Post-1.0 - Fix Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.5.2" }
```

**Commits:**
- `fix: resolve bug`

**Expected:**
- Version: `1.5.2` → `1.5.3` (patch)

---

### 13. Post-1.0 - Feat Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.5.2" }
```

**Commits:**
- `feat: add feature`

**Expected:**
- Version: `1.5.2` → `1.6.0` (minor)

---

### 14. Post-1.0 - Breaking Change

**Setup:**
```
package.json: { name: "test-pkg", version: "1.5.2" }
```

**Commits:**
- `feat!: breaking change`

**Expected:**
- Version: `1.5.2` → `2.0.0` (major)

---

### 15. Post-1.0 - Perf Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.5.2" }
```

**Commits:**
- `perf: optimize queries`

**Expected:**
- Version: `1.5.2` → `1.5.3` (patch)

---

## Edge Cases

### 16. Multiple Bump Types - Highest Wins

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
```

**Commits:**
- `fix: bug fix`
- `feat: new feature`
- `feat!: breaking change`

**Expected:**
- Version: `1.0.0` → `2.0.0` (major wins)
- Changelog has all three sections

---

### 17. BREAKING CHANGE in Body

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
```

**Commits:**
```
feat: new API

BREAKING CHANGE: Old API removed
```

**Expected:**
- Version: `1.0.0` → `2.0.0` (major)
- Breaking change detected from body

---

### 18. Scoped Commits

**Setup:**
```
Workspaces: @test/core, @test/utils
```

**Commits:**
- `feat(core): add API`
- `fix(utils): resolve bug`

**Expected:**
- Commits assigned to correct packages by scope
- Both packages bumped appropriately

---

### 19. No Changes Since Last Tag

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
Last tag: test-pkg@1.0.0
```

**Commits:**
- (none since tag)

**Expected:**
- No packages to release
- Output: "No changes since last release"

---

### 20. Mixed Semantic and Non-Semantic

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
```

**Commits:**
- `feat: new feature`
- `chore: update deps`
- `style: format`
- `fix: bug fix`

**Expected:**
- Version: `1.0.0` → `1.1.0` (minor from feat)
- Changelog includes only feat, fix

---

## CLI Argument Scenarios

### 21. Force Patch Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
CLI args: shipit patch
```

**Commits:**
- `feat: new feature` (would be minor)

**Expected:**
- Version: `1.0.0` → `1.0.1` (forced patch)

---

### 22. Force Minor Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
CLI args: shipit minor
```

**Commits:**
- `fix: bug` (would be patch)

**Expected:**
- Version: `1.0.0` → `1.1.0` (forced minor)

---

### 23. Force Major Bump

**Setup:**
```
package.json: { name: "test-pkg", version: "1.0.0" }
CLI args: shipit major
```

**Commits:**
- `fix: bug` (would be patch)

**Expected:**
- Version: `1.0.0` → `2.0.0` (forced major)

---

### 24. Specific Package Selection

**Setup:**
```
Workspaces: @test/core, @test/utils, @test/cli
CLI args: shipit --package @test/core
```

**Commits:**
- `feat: feature in all packages` (files in all packages)

**Expected:**
- Only `@test/core` released
- Other packages ignored

---

## Test Implementation Notes

### Mock Structure

```typescript
// Mock execa for git commands
vi.mock('execa', () => ({
  execa: vi.fn((cmd, args) => {
    if (cmd === 'git' && args[0] === 'describe') {
      return { stdout: 'test-pkg@1.0.0' };
    }
    if (cmd === 'git' && args[0] === 'log') {
      return { stdout: mockGitLog };
    }
    if (cmd === 'npm' && args[0] === 'query') {
      return { stdout: JSON.stringify(mockWorkspaces) };
    }
  })
}));

// Mock fs for package.json
vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path) => {
    if (path.includes('package.json')) {
      return JSON.stringify(mockPackageJson);
    }
  })
}));
```

### Test Helpers

```typescript
function createMockCommit(type: string, message: string, files: string[]): string {
  return `abc123|${type}: ${message}|Author|2026-01-18T10:00:00Z\n${files.join('\n')}`;
}

function createMockWorkspace(name: string, version: string, path: string) {
  return { name, version, location: path, private: false };
}
```

---

## Priority

**Phase 1 (MVP):**
- ✅ Scenarios 1-4, 7 (core functionality)
- ✅ Scenarios 8-15 (version bump permutations)

**Phase 2 (Complete):**
- ✅ Scenarios 5-6 (advanced features)
- ✅ Scenarios 16-20 (edge cases)
- ✅ Scenarios 21-24 (CLI arguments)

**Phase 3 (Polish):**
- Error scenarios (invalid semver, git failures, etc.)
- Performance tests (large monorepos)
- Integration with real git (optional)

---

*Status: ✅ Implemented (24 scenarios across 6 test files)*
