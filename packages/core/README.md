# @bonvoy/core 🚢

> Core hook system for bonvoy release automation

The heart of bonvoy - provides the plugin architecture, configuration system, and workspace detection for npm monorepos.

## Features

- 🔌 **Plugin Architecture** - Extensible hook system using [tapable](https://github.com/webpack/tapable)
- 📦 **Monorepo Support** - npm workspaces detection and management
- ⚙️ **Configuration** - Flexible config loading with [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
- 🛡️ **Type Safety** - Runtime validation with [Zod](https://zod.dev)
- 📋 **Schema Generation** - JSON Schema for IDE autocompletion

## Installation

```bash
npm install @bonvoy/core
```

## Usage

### Basic Plugin

```typescript
import { Bonvoy, BonvoyPlugin } from '@bonvoy/core';

class MyPlugin implements BonvoyPlugin {
  name = 'my-plugin';

  apply(bonvoy: Bonvoy) {
    bonvoy.hooks.beforeShipIt.tap(this.name, (context) => {
      console.log('Starting release...');
    });
  }
}

const bonvoy = new Bonvoy();
bonvoy.use(new MyPlugin());
```

### Configuration

```typescript
import { loadConfig } from '@bonvoy/core';

const config = await loadConfig();
console.log(config.versioning); // 'independent' | 'fixed'
```

### Workspace Detection

```typescript
import { detectWorkspaces } from '@bonvoy/core';

const packages = await detectWorkspaces('/path/to/monorepo');
console.log(packages.map((p) => p.name));
```

## Hook System

Available hooks for plugins:

- `beforeShipIt` - Before starting release process
- `validateRepo` - Validate repository state
- `getVersion` - Determine version bump for packages
- `version` - Apply version changes
- `afterVersion` - After version changes applied
- `beforeChangelog` - Before generating changelog
- `generateChangelog` - Generate changelog content
- `afterChangelog` - After changelog generated
- `beforePublish` - Before publishing packages
- `publish` - Publish packages
- `afterPublish` - After packages published
- `beforeRelease` - Before creating releases
- `makeRelease` - Create releases
- `afterRelease` - After releases created

## Configuration Schema

```typescript
interface BonvoyConfig {
  versioning?: 'independent' | 'fixed';
  rootVersionStrategy?: 'max' | 'patch' | 'none';
  commitMessage?: string;
  tagFormat?: string;
  changelog?: {
    global?: boolean;
    sections?: Record<string, string>;
  };
  workflow?: 'direct' | 'pr';
  baseBranch?: string;
  plugins?: (string | [string, object])[];
}
```

## License

MIT
