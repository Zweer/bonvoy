# Configuration

bonvoy works with zero configuration. When you need to customize, create a config file.

## Config File

Supported formats (searched in this order):

- `bonvoy.config.js`
- `bonvoy.config.mjs`
- `bonvoy.config.ts`
- `bonvoy.config.json`
- `bonvoy.config.yaml` / `bonvoy.config.yml`
- `bonvoy.config.toml`
- `.bonvoyrc` / `.bonvoyrc.json` / `.bonvoyrc.yaml` / `.bonvoyrc.yml`
- `"bonvoy"` key in `package.json`

Config is loaded via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) and validated at runtime with [Zod](https://zod.dev).

## Full Example

```javascript
// bonvoy.config.js
export default {
  // Versioning
  versioning: 'independent',     // 'independent' | 'fixed'
  rootVersionStrategy: 'max',    // 'max' | 'patch' | 'none'

  // Git
  commitMessage: 'chore: :bookmark: release',
  tagFormat: '{name}@{version}',

  // Changelog
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

  // Conventional commits
  conventional: {
    preset: 'angular',
  },

  // Git plugin
  git: {
    push: true,
  },

  // npm plugin
  npm: {
    registry: 'https://registry.npmjs.org',
    access: 'public',
    skipExisting: true,
    provenance: true,
  },

  // GitHub plugin
  github: {
    draft: false,
  },

  // Workflow
  workflow: 'direct',
  baseBranch: 'main',

  // Additional plugins
  plugins: [],
};
```

## Options Reference

### `versioning`

- **Type:** `'independent' | 'fixed'`
- **Default:** `'independent'`

How packages are versioned in a monorepo.

- `independent` — each package has its own version based on its changes
- `fixed` — all packages share the same version (highest bump wins)

### `rootVersionStrategy`

- **Type:** `'max' | 'patch' | 'none'`
- **Default:** `'max'`

How the root `package.json` version is updated in a monorepo.

- `max` — set to the highest version among released packages
- `patch` — bump root version by patch on any release
- `none` — don't update root version

### `commitMessage`

- **Type:** `string`
- **Default:** `'chore: :bookmark: release'`

Git commit message for the release commit. Supports placeholders:

| Placeholder | Description |
|-------------|-------------|
| `{packages}` | Comma-separated package names |
| `{details}` | Package list with versions (one per line) |

If `{details}` is not used, package details are appended as the commit body automatically.

### `tagFormat`

- **Type:** `string`
- **Default:** `'{name}@{version}'`

Format for git tags. Supports placeholders:

| Placeholder | Description |
|-------------|-------------|
| `{name}` | Package name |
| `{version}` | Package version |

### `changelog`

#### `changelog.global`

- **Type:** `boolean`
- **Default:** `false`

Generate a global changelog at the repo root (in addition to per-package changelogs).

#### `changelog.sections`

- **Type:** `Record<string, string>`
- **Default:** see example above

Map of commit types to changelog section headers.

### `conventional`

#### `conventional.preset`

- **Type:** `'angular' | 'conventional' | 'atom' | 'custom'`
- **Default:** `'angular'`

Which commit convention to use.

| Preset | `feat` | `fix` | `perf` |
|--------|--------|-------|--------|
| `angular` | minor | patch | patch |
| `conventional` | minor | patch | patch |
| `atom` | `:sparkles:` → minor | `:bug:` → patch | `:racehorse:` → patch |
| `custom` | defined by `types` | defined by `types` | defined by `types` |

#### `conventional.types`

- **Type:** `Record<string, 'major' | 'minor' | 'patch' | 'none'>`
- **Default:** `undefined`

Custom type-to-bump mapping. Only used when `preset: 'custom'`.

```javascript
export default {
  conventional: {
    preset: 'custom',
    types: {
      feat: 'minor',
      fix: 'patch',
      perf: 'patch',
      refactor: 'patch',  // custom: refactor triggers a patch
    },
  },
};
```

### `git`

#### `git.push`

- **Type:** `boolean`
- **Default:** `true`

Push commits and tags to the remote after release.

#### `git.commitMessage`

- **Type:** `string`
- **Default:** inherits from top-level `commitMessage`

Override commit message for the git plugin specifically.

#### `git.tagFormat`

- **Type:** `string`
- **Default:** inherits from top-level `tagFormat`

Override tag format for the git plugin specifically.

### `npm`

#### `npm.registry`

- **Type:** `string`
- **Default:** `'https://registry.npmjs.org'`

npm registry URL.

#### `npm.access`

- **Type:** `'public' | 'restricted'`
- **Default:** `'public'`

Access level for published packages. Scoped packages default to `restricted` on npm, so set `'public'` to publish them publicly.

#### `npm.skipExisting`

- **Type:** `boolean`
- **Default:** `true`

Skip publishing if the version already exists on the registry.

#### `npm.provenance`

- **Type:** `boolean`
- **Default:** `true`

Enable [npm provenance](https://docs.npmjs.com/generating-provenance-statements) for supply chain security. Requires `id-token: write` permission in GitHub Actions.

### `github`

#### `github.draft`

- **Type:** `boolean`
- **Default:** `false`

Create GitHub releases as drafts.

#### `github.prerelease`

- **Type:** `boolean`
- **Default:** auto-detected

Force the prerelease flag on GitHub releases. By default, bonvoy detects prerelease versions automatically (e.g., `1.0.0-beta.1`).

#### `github.owner` / `github.repo`

- **Type:** `string`
- **Default:** auto-detected from `git remote`

Override the GitHub owner and repository. Usually not needed — bonvoy parses `git remote get-url origin` automatically.

#### `github.token`

- **Type:** `string`
- **Default:** `process.env.GITHUB_TOKEN`

GitHub token. Defaults to the `GITHUB_TOKEN` environment variable.

### `gitlab`

#### `gitlab.host`

- **Type:** `string`
- **Default:** `'https://gitlab.com'`

GitLab instance URL.

#### `gitlab.projectId`

- **Type:** `string | number`
- **Default:** `undefined`

GitLab project ID. Required for GitLab operations.

#### `gitlab.token`

- **Type:** `string`
- **Default:** `process.env.GITLAB_TOKEN`

GitLab token.

### `workflow`

- **Type:** `'direct' | 'pr'`
- **Default:** `'direct'`

Release workflow mode.

- `direct` — release immediately with `bonvoy shipit`
- `pr` — create a release PR with `bonvoy prepare`, publish after merge

### `baseBranch`

- **Type:** `string`
- **Default:** `'main'`

The base branch for releases and PR targets.

### `plugins`

- **Type:** `(string | [string, object])[]`
- **Default:** `[]`

Additional plugins to load. Default plugins are always loaded unless explicitly disabled.

```javascript
export default {
  plugins: [
    '@bonvoy/plugin-exec',                              // no config
    ['@bonvoy/plugin-slack', { webhookUrl: '...' }],    // with config
  ],
};
```

### `hooks`

- **Type:** `Record<string, Function>`
- **Default:** `undefined`

Inline hook functions. Useful for simple customizations without writing a full plugin.

```javascript
export default {
  hooks: {
    afterRelease: (context) => {
      console.log(`Released ${context.changedPackages.length} packages!`);
    },
  },
};
```

## Validation

Config is validated at runtime using Zod. If you pass an invalid option, you'll get a clear error:

```
Invalid configuration: Expected 'independent' | 'fixed', received 'auto'
```

## TypeScript

For type-safe config files, use `bonvoy.config.ts`:

```typescript
import type { BonvoyConfig } from '@bonvoy/core';

export default {
  versioning: 'independent',
  npm: { access: 'public' },
} satisfies BonvoyConfig;
```
