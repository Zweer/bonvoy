# Monorepo Guide

bonvoy is built for monorepos. If your project uses npm workspaces, everything works automatically.

## Setup

Your `package.json` should have a `workspaces` field:

```json
{
  "name": "my-monorepo",
  "workspaces": ["packages/*"]
}
```

That's it. No extra config needed.

## How It Works

### Commit Assignment

When you run `bonvoy shipit`, each commit is assigned to packages based on which files it modified:

```
commit: "feat: add validation"
  modified: packages/core/src/validate.ts
  → assigned to: @scope/core

commit: "fix: resolve parsing bug"
  modified: packages/parser/src/index.ts
  modified: packages/core/src/types.ts
  → assigned to: @scope/parser, @scope/core
```

### Independent Versioning (default)

Each package gets its own version based on its commits:

```
@scope/core:   1.2.0 → 1.3.0  (had a feat commit)
@scope/parser: 0.5.1 → 0.5.2  (had a fix commit)
@scope/utils:  no changes       (not released)
```

### Fixed Versioning

All packages share the same version. The highest bump wins:

```javascript
// bonvoy.config.js
export default {
  versioning: 'fixed',
};
```

```
@scope/core:   1.2.0 → 1.3.0  (feat → minor)
@scope/parser: 1.2.0 → 1.3.0  (fix → patch, but minor wins)
@scope/utils:  1.2.0 → 1.3.0  (no changes, but fixed versioning)
```

## Root Package Version

In a monorepo, the root `package.json` version is updated automatically:

| Strategy | Behavior |
|----------|----------|
| `max` (default) | Set to the highest version among released packages |
| `patch` | Bump by patch on any release |
| `none` | Don't update root version |

```javascript
export default {
  rootVersionStrategy: 'max',  // default
};
```

## Internal Dependencies

bonvoy automatically updates cross-package references. If `@scope/cli` depends on `@scope/core`:

```json
// Before release
{ "dependencies": { "@scope/core": "^1.2.0" } }

// After @scope/core is bumped to 1.3.0
{ "dependencies": { "@scope/core": "^1.3.0" } }
```

This applies to `dependencies`, `devDependencies`, and `peerDependencies`.

## Selective Release

Release only specific packages:

```bash
bonvoy shipit --package @scope/core
bonvoy shipit --package @scope/core --package @scope/utils
```

## Per-Package Changelogs

Each package gets its own `CHANGELOG.md` in its directory:

```
packages/
├── core/
│   ├── CHANGELOG.md    ← only core's changes
│   └── package.json
├── parser/
│   ├── CHANGELOG.md    ← only parser's changes
│   └── package.json
```

## Per-Package Tags

Each package gets its own git tag:

```
@scope/core@1.3.0
@scope/parser@0.5.2
```

## Per-Package GitHub Releases

Each package gets its own GitHub release with its changelog as the body.

## Example: Full Monorepo Config

```javascript
// bonvoy.config.js
export default {
  versioning: 'independent',
  rootVersionStrategy: 'max',
  tagFormat: '{name}@{version}',
  changelog: {
    global: true,  // also generate root CHANGELOG.md
  },
};
```
