# Writing Plugins

bonvoy's plugin system is built on [tapable](https://github.com/webpack/tapable). A plugin is a class that taps into lifecycle hooks.

## Minimal Plugin

```typescript
import type { BonvoyPlugin } from '@bonvoy/core';
import type { Bonvoy } from '@bonvoy/core';

export default class MyPlugin implements BonvoyPlugin {
  name = 'my-plugin';

  apply(bonvoy: Bonvoy): void {
    bonvoy.hooks.afterRelease.tap(this.name, (context) => {
      console.log(`Released ${context.changedPackages.length} packages!`);
    });
  }
}
```

## With Configuration

```typescript
import type { BonvoyPlugin, ReleaseContext } from '@bonvoy/core';
import type { Bonvoy } from '@bonvoy/core';

interface SlackConfig {
  webhookUrl: string;
  channel?: string;
}

export default class SlackPlugin implements BonvoyPlugin {
  name = 'slack';
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
  }

  apply(bonvoy: Bonvoy): void {
    bonvoy.hooks.afterRelease.tapPromise(this.name, async (context: ReleaseContext) => {
      if (context.isDryRun) return;

      const packages = context.changedPackages
        .map(p => `${p.name}@${context.versions[p.name]}`)
        .join(', ');

      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚢 Released: ${packages}`,
        }),
      });
    });
  }
}
```

Users configure it:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['./my-slack-plugin.js', { webhookUrl: 'https://...' }],
  ],
};
```

## Hook Types

### Sync Hooks

Use `tap` for synchronous operations:

```typescript
bonvoy.hooks.validateRepo.tap(this.name, (context) => {
  if (!context.config.baseBranch) {
    throw new Error('baseBranch is required');
  }
});
```

### Async Hooks

Use `tapPromise` for async operations:

```typescript
bonvoy.hooks.publish.tapPromise(this.name, async (context) => {
  await publishToRegistry(context.packages);
});
```

### Waterfall Hooks

Some hooks pass a value through the chain. Return the modified value:

```typescript
bonvoy.hooks.modifyConfig.tap(this.name, (config) => {
  return { ...config, tagFormat: 'v{version}' };
});

bonvoy.hooks.getVersion.tap(this.name, (context) => {
  return 'minor';  // force minor bump
});
```

## Available Hooks

See the [Hooks Reference](/reference/hooks) for the complete list.

## Context Objects

Each hook receives a context object. The context grows as the release progresses:

| Phase | Context | Extra fields |
|-------|---------|-------------|
| Validation | `Context` | `config`, `packages`, `commits`, `isDryRun` |
| Version | `VersionContext` | + `versions`, `bumps` |
| Changelog | `ChangelogContext` | + `changelogs` |
| Publish | `PublishContext` | + `publishedPackages`, `preid` |
| Release | `ReleaseContext` | + `releases` |
| PR | `PRContext` | `branchName`, `baseBranch`, `title`, `body` |

## Testing Plugins

```typescript
import { Bonvoy } from '@bonvoy/core';
import { describe, expect, it } from 'vitest';
import MyPlugin from './my-plugin.js';

describe('MyPlugin', () => {
  it('should tap into afterRelease', () => {
    const bonvoy = new Bonvoy();
    const plugin = new MyPlugin();
    plugin.apply(bonvoy);

    // Verify the hook was tapped
    expect(bonvoy.hooks.afterRelease.taps).toHaveLength(1);
  });
});
```

## Publishing Your Plugin

Name your package `bonvoy-plugin-<name>` or `@scope/bonvoy-plugin-<name>` so it's discoverable on npm.
