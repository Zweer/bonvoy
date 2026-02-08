# API Reference

Use bonvoy programmatically in your own tools.

## Core

### `Bonvoy`

The main class that holds hooks and plugins.

```typescript
import { Bonvoy } from '@bonvoy/core';

const bonvoy = new Bonvoy(config);
bonvoy.use(myPlugin);
```

#### `constructor(config?: BonvoyConfig)`

Create a new Bonvoy instance with optional config.

#### `hooks: ReleaseHooks`

Access all lifecycle hooks. See [Hooks Reference](/reference/hooks).

#### `use(plugin: BonvoyPlugin): void`

Register a plugin.

### `loadConfig`

```typescript
import { loadConfig } from '@bonvoy/core';

const config = await loadConfig('/path/to/project');
const config = await loadConfig('/path/to/project', '/path/to/config.js');
```

Load and validate configuration from the project root.

### `assignCommitsToPackages`

```typescript
import { assignCommitsToPackages } from '@bonvoy/core';

const commitsWithPackages = assignCommitsToPackages(commits, packages, rootPath);
```

Assign commits to packages based on which files were modified.

## CLI

### `shipit`

```typescript
import { shipit } from '@bonvoy/cli';

const result = await shipit('minor', {
  dryRun: true,
  cwd: '/path/to/project',
  silent: true,
});

// result.versions    → { '@scope/core': '1.3.0' }
// result.bumps       → { '@scope/core': 'minor' }
// result.changelogs  → { '@scope/core': '## 1.3.0\n...' }
// result.changedPackages → [{ name: '@scope/core', ... }]
```

#### Options

```typescript
interface ShipitOptions {
  dryRun?: boolean;
  cwd?: string;
  silent?: boolean;
  json?: boolean;
  package?: string[];
  preid?: string;
  config?: BonvoyConfig;
  plugins?: BonvoyPlugin[];
}
```

### `prepare`

```typescript
import { prepare } from '@bonvoy/cli';

const result = await prepare({
  dryRun: true,
  cwd: '/path/to/project',
  bump: 'minor',
});

// result.branchName → 'release/1707321600000'
// result.versions   → { '@scope/core': '1.3.0' }
// result.prUrl      → 'https://github.com/owner/repo/pull/42'
```

#### Options

```typescript
interface PrepareOptions {
  dryRun?: boolean;
  cwd?: string;
  silent?: boolean;
  config?: BonvoyConfig;
  preid?: string;
  bump?: string;
}
```

## Types

All types are exported from `@bonvoy/core`:

```typescript
import type {
  BonvoyConfig,
  BonvoyPlugin,
  CommitInfo,
  Context,
  VersionContext,
  ChangelogContext,
  PublishContext,
  ReleaseContext,
  PRContext,
  Package,
  SemverBump,
  ReleaseHooks,
  Logger,
} from '@bonvoy/core';
```
