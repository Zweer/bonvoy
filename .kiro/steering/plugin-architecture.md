# Plugin Architecture

## Overview

bonvoy is built on a **plugin-first architecture**. The core provides a hook system (using tapable), and all functionality is implemented via plugins.

## Hook System

### Tapable
- Uses [tapable](https://github.com/webpack/tapable) (same as webpack)
- Provides synchronous and asynchronous hooks
- Plugins tap into hooks to extend functionality

### Hook Types
- `SyncHook` — Synchronous, no return value
- `AsyncSeriesHook` — Async, runs in series
- `AsyncParallelHook` — Async, runs in parallel

## Release Lifecycle

Hooks are called in this order during a release:

```
modifyConfig
  ↓
beforeShipIt
  ↓
validateRepo
  ↓
getVersion (per package)
  ↓
version (per package)
  ↓
afterVersion (per package)
  ↓
beforeChangelog (per package)
  ↓
generateChangelog (per package)
  ↓
afterChangelog (per package)
  ↓
beforePublish
  ↓
publish (per package)
  ↓
afterPublish
  ↓
beforeRelease (per package)
  ↓
makeRelease (per package)
  ↓
afterRelease
  ↓
rollback (on failure or manual)
```

## Hook Signatures

See `packages/core/src/hooks.ts` for full type definitions.

### Configuration Phase
```typescript
modifyConfig: AsyncSeriesHook<[Config], Config>
```

### Validation Phase
```typescript
beforeShipIt: AsyncSeriesHook<[Context]>
validateRepo: AsyncSeriesHook<[Context]>
```

### Version Phase
```typescript
getVersion: AsyncSeriesHook<[Context], SemverBump | string | undefined>
version: AsyncSeriesHook<[VersionContext]>
afterVersion: AsyncSeriesHook<[VersionContext]>
```

### Changelog Phase
```typescript
beforeChangelog: AsyncSeriesHook<[ChangelogContext]>
generateChangelog: AsyncSeriesHook<[ChangelogContext], string | undefined>
afterChangelog: AsyncSeriesHook<[ChangelogContext]>
```

### Publish Phase
```typescript
beforePublish: AsyncSeriesHook<[PublishContext]>
publish: AsyncSeriesHook<[PublishContext]>
afterPublish: AsyncSeriesHook<[PublishContext]>
```

### Release Phase
```typescript
beforeRelease: AsyncSeriesHook<[ReleaseContext]>
makeRelease: AsyncSeriesHook<[ReleaseContext]>
afterRelease: AsyncSeriesHook<[ReleaseContext]>
```

### PR Workflow
```typescript
beforeCreatePR: AsyncSeriesHook<[PRContext]>
createPR: AsyncSeriesHook<[PRContext]>
afterCreatePR: AsyncSeriesHook<[PRContext]>
```

### Rollback
```typescript
rollback: AsyncSeriesHook<[RollbackContext]>
```

## Plugin Structure

### Basic Plugin
```typescript
import type { Bonvoy } from '@bonvoy/core';

export interface MyPluginConfig {
  option: string;
}

export class MyPlugin {
  name = 'my-plugin';
  
  constructor(private config: MyPluginConfig = { option: 'default' }) {}
  
  apply(bonvoy: Bonvoy): void {
    bonvoy.hooks.beforeShipIt.tapPromise('my-plugin', async (context) => {
      // Plugin logic
      console.log('Running my plugin');
    });
  }
}
```

### Tapping into Hooks
```typescript
// Async hook
bonvoy.hooks.beforeShipIt.tapPromise('my-plugin', async (context) => {
  await doSomethingAsync();
});

// Return value (for getVersion, generateChangelog)
bonvoy.hooks.getVersion.tapPromise('my-plugin', async (context) => {
  return 'minor'; // or 'major', 'patch', '1.2.3'
});

// Modify context
bonvoy.hooks.beforePublish.tapPromise('my-plugin', async (context) => {
  context.customData = { foo: 'bar' };
});
```

## Context

The `Context` object is passed to all hooks and contains:

```typescript
interface Context {
  config: Config;                    // Resolved configuration
  rootPath: string;                  // Repository root
  packages: Package[];               // All packages in workspace
  commits?: Commit[];                // Commits since last release
  changelogs: Record<string, string>; // Generated changelogs
  isDryRun: boolean;                 // Dry-run mode flag
  actionLog: ActionLog;              // For rollback
  currentPackage?: Package;          // Current package (in per-package hooks)
  // ... plugin-specific data
}
```

## Default Plugins

These plugins are loaded automatically unless disabled:

| Plugin | Hooks | Purpose |
|--------|-------|---------|
| `plugin-conventional` | `getVersion` | Parse conventional commits → semver bump |
| `plugin-changelog` | `generateChangelog`, `afterChangelog` | Generate CHANGELOG.md |
| `plugin-git` | `validateRepo`, `afterVersion`, `afterRelease`, `rollback` | Commit, tag, push |
| `plugin-npm` | `publish`, `rollback` | Publish to npm |
| `plugin-github` | `makeRelease`, `createPR`, `rollback` | GitHub releases and PRs |

## Optional Plugins

Must be installed and configured:

| Plugin | Purpose |
|--------|---------|
| `plugin-gitlab` | GitLab releases and MRs |
| `plugin-exec` | Run custom shell commands |
| `plugin-changeset` | Changeset-compatible workflow |
| `plugin-ai` | AI-generated release notes |
| `plugin-slack` | Slack notifications |
| `plugin-discord` | Discord notifications |
| `plugin-telegram` | Telegram notifications |
| `plugin-teams` | Microsoft Teams notifications |

## Plugin Configuration

### In bonvoy.config.js
```javascript
export default {
  plugins: [
    // String (uses default config)
    '@bonvoy/plugin-slack',
    
    // Array (with config)
    ['@bonvoy/plugin-ai', { provider: 'openai', model: 'gpt-4o-mini' }],
    
    // Instance (for custom plugins)
    new MyCustomPlugin({ option: 'value' }),
  ],
};
```

### Disabling Default Plugins
```javascript
export default {
  plugins: [
    // Disable github plugin
    ['@bonvoy/plugin-github', false],
  ],
};
```

## Action Log (for Rollback)

Plugins record actions for rollback:

```typescript
bonvoy.hooks.publish.tapPromise('npm', async (context) => {
  // Publish package
  await publishToNpm(pkg);
  
  // Record action for rollback
  context.actionLog.record({
    plugin: 'npm',
    action: 'publish',
    data: { name: pkg.name, version: pkg.version }
  });
});

// Rollback handler
bonvoy.hooks.rollback.tapPromise('npm', async (context) => {
  const actions = context.actionLog.entries().filter(a => a.plugin === 'npm');
  
  for (const action of actions.reverse()) {
    if (action.action === 'publish') {
      await unpublishFromNpm(action.data.name, action.data.version);
    }
  }
});
```

## Plugin Registration Order

Order matters for rollback — plugins registered first are rolled back first:

1. `plugin-npm` (rollback first — unpublish before reverting git)
2. `plugin-github` / `plugin-gitlab` (delete releases)
3. `plugin-git` (rollback last — reset commits and tags)

## Writing Custom Plugins

See `.kiro/skills/new-package.md` for creating a new plugin package.

### Plugin Checklist
- [ ] Implement `apply(bonvoy: Bonvoy)` method
- [ ] Tap into relevant hooks
- [ ] Handle errors gracefully
- [ ] Record actions for rollback (if destructive)
- [ ] Add rollback handler
- [ ] Export config interface
- [ ] Write tests (100% coverage)
- [ ] Document in README

### Example: Notification Plugin
```typescript
export class SlackPlugin {
  name = 'slack';
  
  constructor(private config: { webhookUrl: string }) {}
  
  apply(bonvoy: Bonvoy): void {
    bonvoy.hooks.afterRelease.tapPromise('slack', async (context) => {
      const message = `Released ${context.packages.length} packages`;
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        body: JSON.stringify({ text: message })
      });
    });
  }
}
```

## Best Practices

### Hook Selection
- Use `before*` hooks for validation
- Use main hooks (`version`, `publish`, etc.) for primary actions
- Use `after*` hooks for side effects (notifications, cleanup)

### Error Handling
- Throw errors for critical failures
- Log warnings for non-critical issues
- Provide clear error messages with solutions

### Performance
- Avoid blocking operations in hooks
- Use `Promise.all()` for parallel operations
- Cache expensive computations

### Testing
- Mock external services (APIs, file system)
- Test each hook independently
- Test rollback handlers
- Test error scenarios

### Documentation
- Document which hooks the plugin uses
- Document configuration options
- Provide usage examples
- Document rollback behavior (if applicable)
