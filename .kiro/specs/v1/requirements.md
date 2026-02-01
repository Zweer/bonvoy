# bonvoy - Release Tool Requirements

> "Bon voyage to your releases!" 🚢
>
> A plugin-based release automation tool for npm packages and monorepos.

## Project Info

| Item | Value |
|------|-------|
| **Name** | bonvoy |
| **Tagline** | "Bon voyage to your releases!" |
| **GitHub** | `Zweer/bonvoy` |
| **npm org** | `@bonvoy` |
| **CLI command** | `bonvoy` |

## Overview

**bonvoy** is a generic, extensible release tool inspired by [intuit/auto](https://github.com/intuit/auto) and [semantic-release](https://github.com/semantic-release/semantic-release). The core provides an event/hook system, and functionality is implemented via plugins (with sensible defaults included).

## Problems with Existing Tools

| Tool | Issue |
|------|-------|
| **semantic-release** | Too automatic, plugin hell, complex config |
| **release-it** | No native monorepo support (wontfix) |
| **changesets** | PR workflow mandatory, unpredictable bumps |
| **release-please** | PR workflow, complex config |
| **bumpp** | No changelog, no GitHub releases, no monorepo |
| **beachball** | Too complex, change files required |
| **auto** | Label-based, PR-dependent |
| **nx release** | Requires Nx ecosystem |

## Core Design Principles

1. **Plugin-first**: Core is an event bus + workspace detection, everything else is a plugin
2. **Sensible defaults**: Works out-of-the-box for npm + GitHub projects
3. **Flexible workflows**: Direct release, PR-based, or hybrid
4. **Independent versioning**: Each package has its own version (with option for fixed)
5. **Path-based detection**: Commits assigned to packages by file paths modified
6. **Conventional commits**: Only semantic commits trigger releases
7. **Monorepo-native**: npm workspaces support out of the box

## Requirements

### Functional Requirements

#### Versioning
- ✅ **Independent versioning**: Each package maintains its own version
- ✅ **Fixed versioning** (optional): All packages share same version
- ✅ **Force version**: Set specific version for all/some packages (e.g., `2.2.0`)
- ✅ **Pre-release support**: alpha, beta, rc versions (e.g., `1.0.0-beta.1`)
- ✅ **Root package versioning**: Configurable strategy (max of children, patch on any change, etc.)

#### Changelog
- ✅ **Per-package changelog**: Each package gets its own CHANGELOG.md
- ✅ **Global changelog** (optional): Aggregated changelog at repo root
- ✅ **Conventional commits only**: Only `feat:`, `fix:`, `perf:`, etc. included
- ✅ **Path-based assignment**: Commits assigned to packages by modified files
- ✅ **Multi-package commits**: Single commit can appear in multiple changelogs

#### Workflows
- ✅ **Direct release**: One command publishes everything
- ✅ **PR-based release**: Create PR with version bumps + changelog (like changesets/release-please)
- ✅ **Dry-run mode**: Preview all changes without executing
- ✅ **Selective release**: Only packages with changes get released
- ✅ **Manual trigger**: Developer decides when to release

#### Git Operations
- ✅ **Commit**: Version bumps + changelog with configurable message
- ✅ **Tags**: Per-package tags (e.g., `@scope/name@1.2.0`)
- ✅ **Push**: Commits and tags to remote

#### npm Operations
- ✅ **Publish**: All changed packages to npm
- ✅ **OIDC authentication**: No NPM_TOKEN needed in CI
- ✅ **Internal dependencies**: Auto-update cross-package references

#### GitHub Operations
- ✅ **Releases**: Create GitHub release per package with changelog
- ✅ **PR creation**: For PR-based workflow

#### Pre-release Validation
- ⬜ **Tag existence check**: Verify git tags don't already exist before release
- ⬜ **GitHub release check**: Verify GitHub releases don't already exist
- ⬜ **npm version check**: Verify npm package version not already published
- ⬜ **npm first publish check**: Warn if first publish without NPM_TOKEN (OIDC requires existing package)
- ⬜ **Graceful abort**: Stop process before any changes if validation fails

### Non-Functional Requirements

- ✅ **No change files**: No `.changeset/` or similar tracking files (by default)
- ✅ **Minimal config**: Works with zero config, customizable when needed
- ✅ **Fast**: Complete release in < 60 seconds
- ✅ **Clear errors**: Helpful messages with solutions
- ✅ **Rollback tracking**: Log what happened for manual recovery

## Architecture

### Plugin System

The core provides a hook system using [tapable](https://github.com/webpack/tapable). Default plugins are loaded automatically, optional plugins extend functionality.

```
┌─────────────────────────────────────────────────────────────┐
│                       @bonvoy/core                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Hook System + Workspace Detection + Config Loading      ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    DEFAULT PLUGINS                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ conventional│ │     git     │ │     npm     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐                           │
│  │   github    │ │  changelog  │                           │
│  └─────────────┘ └─────────────┘                           │
├─────────────────────────────────────────────────────────────┤
│                   OPTIONAL PLUGINS                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │  gitlab   │ │   slack   │ │   exec    │ │ changeset │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Release Lifecycle Hooks

Based on intuit/auto's hook system:

```typescript
interface ReleaseHooks {
  // Configuration phase
  modifyConfig: Hook<[Config], Config>;
  
  // Validation phase
  beforeShipIt: Hook<[Context], void>;
  validateRepo: Hook<[Context], void>;
  
  // Version phase
  getVersion: Hook<[Context], SemverBump>;
  version: Hook<[VersionContext], void>;
  afterVersion: Hook<[VersionContext], void>;
  
  // Changelog phase
  beforeChangelog: Hook<[ChangelogContext], void>;
  generateChangelog: Hook<[ChangelogContext], string>;
  afterChangelog: Hook<[ChangelogContext], void>;
  
  // Publish phase
  beforePublish: Hook<[PublishContext], void>;
  publish: Hook<[PublishContext], void>;
  afterPublish: Hook<[PublishContext], void>;
  
  // Release phase
  beforeRelease: Hook<[ReleaseContext], void>;
  makeRelease: Hook<[ReleaseContext], void>;
  afterRelease: Hook<[ReleaseContext], void>;
  
  // PR workflow
  beforeCreatePR: Hook<[PRContext], void>;
  createPR: Hook<[PRContext], void>;
  afterCreatePR: Hook<[PRContext], void>;
}
```

### Package Structure

```
bonvoy/                          # GitHub: Zweer/bonvoy
├── packages/
│   ├── core/                    # @bonvoy/core - Hook system, CLI, config
│   │   ├── src/
│   │   │   ├── index.ts         # Main entry
│   │   │   ├── cli.ts           # CLI entry point
│   │   │   ├── hooks.ts         # Hook system (tapable)
│   │   │   ├── config.ts        # Config loading
│   │   │   ├── workspace.ts     # npm workspaces detection
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   │   # DEFAULT PLUGINS (loaded automatically)
│   ├── plugin-conventional/     # @bonvoy/plugin-conventional
│   ├── plugin-git/              # @bonvoy/plugin-git
│   ├── plugin-npm/              # @bonvoy/plugin-npm
│   ├── plugin-github/           # @bonvoy/plugin-github
│   ├── plugin-changelog/        # @bonvoy/plugin-changelog
│   │
│   │   # OPTIONAL PLUGINS
│   ├── plugin-gitlab/           # @bonvoy/plugin-gitlab
│   ├── plugin-slack/            # @bonvoy/plugin-slack
│   ├── plugin-exec/             # @bonvoy/plugin-exec
│   └── plugin-changeset/        # @bonvoy/plugin-changeset
│
└── package.json
```

### Default vs Optional Plugins

**Default plugins** (loaded automatically unless disabled):
- `@bonvoy/plugin-conventional` - Parse conventional commits for version bump
- `@bonvoy/plugin-git` - Commit, tag, push
- `@bonvoy/plugin-npm` - Publish to npm with OIDC
- `@bonvoy/plugin-github` - Create GitHub releases
- `@bonvoy/plugin-changelog` - Generate CHANGELOG.md

**Optional plugins** (must be installed and configured):
- `@bonvoy/plugin-gitlab` - GitLab releases instead of GitHub
- `@bonvoy/plugin-slack` - Post release notifications
- `@bonvoy/plugin-exec` - Run custom shell commands
- `@bonvoy/plugin-changeset` - Changeset-compatible workflow (see below)

### Versioning Strategy Plugins

The version determination is pluggable:

| Strategy | Plugin | Description |
|----------|--------|-------------|
| **Conventional** | `@bonvoy/plugin-conventional` (default) | Bump from conventional commit messages |
| **Changeset** | `@bonvoy/plugin-changeset` | Track changes via `.changeset/*.md` or `.bonvoy/*.md` files |

Strategies can be combined: conventional by default, with manual override when needed.

### Plugin Changeset Specification

`@bonvoy/plugin-changeset` provides a changeset-compatible workflow with extensions.

#### File Locations

Reads from both directories (for migration compatibility):
- `.changeset/*.md` - Standard changeset location
- `.bonvoy/*.md` - Bonvoy-native location

#### File Format

Uses changeset-compatible format (YAML frontmatter + Markdown):

```markdown
---
"@scope/core": minor
"@scope/utils": patch
---

Description of changes that goes into the changelog.
Can be multi-line.
```

#### Bonvoy Extension: Explicit Versions

Unlike standard changeset, bonvoy supports explicit versions:

```markdown
---
"@scope/core": "2.0.0"
"@scope/utils": minor
---

Breaking release with explicit version for core.
```

#### Multi-file Behavior

When multiple files reference the same package:
- **Bump**: Takes the highest (major > minor > patch)
- **Notes**: Concatenates all descriptions

```markdown
<!-- .changeset/feature-a.md -->
---
"@scope/core": minor
---
Added feature A

<!-- .changeset/feature-b.md -->
---
"@scope/core": patch
---
Fixed bug in feature B
```

Result for `@scope/core`: `minor` bump with both notes in changelog.

#### Behavior

1. Reads all `.md` files from `.changeset/` and `.bonvoy/`
2. Parses frontmatter for package bumps/versions
3. Uses markdown body as changelog notes
4. If notes empty → falls back to conventional commits for that package
5. Deletes processed files after release
6. **Error** if both `plugin-changeset` and `plugin-conventional` are active

## CLI Interface

```bash
# Basic usage
bonvoy shipit                    # Release all changed packages
bonvoy shipit --dry-run          # Preview changes

# Version control
bonvoy shipit patch              # Force patch bump
bonvoy shipit minor              # Force minor bump
bonvoy shipit major              # Force major bump
bonvoy shipit 2.0.0              # Force specific version

# PR workflow
bonvoy prepare                   # Create release PR
bonvoy shipit --from-pr          # Release from merged PR

# Package selection
bonvoy shipit --package @scope/core
bonvoy shipit --package @scope/core --package @scope/utils

# Other commands
bonvoy status                    # Show pending changes
bonvoy changelog                 # Preview changelog
bonvoy version                   # Show computed versions
```

## Configuration

### Config File Formats

Supports: `bonvoy.config.js`, `bonvoy.config.ts`, `bonvoy.config.mjs`, `bonvoy.config.json`, or `package.json` under `"bonvoy"` key.

### Config Schema

```typescript
interface BonvoyConfig {
  // Versioning
  versioning?: 'independent' | 'fixed';
  rootVersionStrategy?: 'max' | 'patch' | 'none';
  
  // Git
  commitMessage?: string;  // default: "chore: release {packages}"
  tagFormat?: string;      // default: "{name}@{version}"
  
  // Changelog
  changelog?: {
    global?: boolean;      // default: false
    sections?: Record<string, string>;
  };
  
  // Workflow
  workflow?: 'direct' | 'pr';
  baseBranch?: string;     // default: "main"
  
  // Plugins
  plugins?: (string | [string, object])[];
  
  // Hooks (inline)
  hooks?: Partial<ReleaseHooks>;
}
```

### Default Config

```javascript
// bonvoy.config.js
export default {
  versioning: 'independent',
  rootVersionStrategy: 'max',
  commitMessage: 'chore: release {packages}',
  tagFormat: '{name}@{version}',
  changelog: {
    global: false,
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
      perf: '⚡ Performance',
      docs: '📚 Documentation',
      breaking: '💥 Breaking Changes',
    },
  },
  workflow: 'direct',
  baseBranch: 'main',
  // Default plugins loaded automatically
};
```

## GitHub Actions Integration

### Direct Release

```yaml
name: Release
on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump (patch/minor/major/x.y.z)'
        required: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npx bonvoy shipit ${{ github.event.inputs.bump }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### PR-based Release

```yaml
name: Release PR
on:
  push:
    branches: [main]

jobs:
  release-pr:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx bonvoy prepare
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Success Criteria

1. **Setup time**: < 2 minutes from install to first release
2. **Zero config**: Works out of the box for standard monorepos
3. **Plugin ecosystem**: Easy to write custom plugins
4. **Error recovery**: Clear guidance on partial failures
5. **Performance**: Complete release in < 60 seconds
6. **Adoption**: Can replace changesets/release-it in existing projects

## Implementation Phases

### Phase 1: Core + Essential Plugins (3-4 days) ✅ COMPLETED
- [x] `@bonvoy/core` - Hook system, CLI, config loading, workspace detection
- [x] `@bonvoy/cli` - CLI orchestration with shipit command
- [x] `@bonvoy/plugin-conventional` - Conventional commits parser
- [x] `@bonvoy/plugin-changelog` - Changelog generation
- [x] `@bonvoy/plugin-git` - Commit, tag, push

### Phase 2: Publishing (2 days) ✅ COMPLETED
- [x] `@bonvoy/plugin-npm` - Publish with OIDC
- [x] Dry-run mode
- [x] `@bonvoy/plugin-github` - GitHub releases
- [x] JSON output for CI

### Phase 3: PR Workflow (2 days) ✅ COMPLETED
- [x] PR creation in `@bonvoy/plugin-github`
- [x] PR creation in `@bonvoy/plugin-gitlab` (MR)
- [x] `prepare` command implementation
- [x] Auto-detection: shipit on main with tracking file → publish-only mode
- [x] PR tracking via `.bonvoy/release-pr.json`

### Phase 4: Optional Plugins (2-3 days) ✅ COMPLETED
- [x] `@bonvoy/plugin-exec` - Custom shell commands
- [x] `@bonvoy/plugin-changeset` - Changeset-compatible workflow
- [x] `@bonvoy/plugin-gitlab` - GitLab support

### Phase 5: Polish (1-2 days) ✅ COMPLETED
- [x] Documentation (plugin READMEs)
- [x] Error messages refinement
- [x] Tests (100% coverage)
- [x] Dogfooding (use bonvoy to release bonvoy!)

---

*Tool name: bonvoy*
*Tagline: "Bon voyage to your releases!"*
*GitHub: Zweer/bonvoy*
*npm org: @bonvoy*
*Decision made: 2026-01-07*
*Status: Requirements complete*
*Estimated effort: 10-13 days*
