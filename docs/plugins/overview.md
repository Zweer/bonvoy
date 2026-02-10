# Plugin System

bonvoy's core is intentionally minimal: a hook system + workspace detection + config loading. All real functionality is implemented via plugins.

## How It Works

Plugins tap into **lifecycle hooks** using [tapable](https://github.com/webpack/tapable) (the same library webpack uses). When you run `bonvoy shipit`, the hooks fire in order and each plugin does its part.

```
shipit
  │
  ├─ modifyConfig        ← plugins can modify config
  ├─ beforeShipIt        ← pre-flight checks
  ├─ getVersion          ← determine version bump (conventional plugin)
  ├─ validateRepo        ← verify tags/versions don't exist
  ├─ version             ← apply version bumps
  ├─ afterVersion
  ├─ beforeChangelog
  ├─ generateChangelog   ← create changelog content (changelog plugin)
  ├─ afterChangelog
  ├─ beforePublish       ← git commit/tag/push (git plugin)
  ├─ publish             ← npm publish (npm plugin)
  ├─ afterPublish
  ├─ beforeRelease
  ├─ makeRelease         ← GitHub/GitLab release (github/gitlab plugin)
  └─ afterRelease
```

## Default Plugins

These are loaded automatically — you don't need to install or configure them:

| Plugin | What it does |
|--------|-------------|
| [conventional](/plugins/conventional) | Parses conventional commits → version bumps |
| [changelog](/plugins/changelog) | Generates CHANGELOG.md per package |
| [git](/plugins/git) | Commits, tags, pushes |
| [npm](/plugins/npm) | Publishes to npm with OIDC provenance |
| [github](/plugins/github) | Creates GitHub releases |

## Optional Plugins

Install and configure these when needed:

| Plugin | What it does |
|--------|-------------|
| [gitlab](/plugins/gitlab) | GitLab releases and merge requests |
| [changeset](/plugins/changeset) | Changeset-compatible workflow |
| [exec](/plugins/exec) | Run custom shell commands at any hook |
| [ai](/plugins/ai) | AI-generated release notes summary |
| [notifications](/plugins/notifications) | Slack, Discord, Telegram, Teams |

## Writing a Plugin

A plugin is a class with a `name` and an `apply` method:

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

### Using Config

Plugins can accept configuration via the constructor:

```typescript
interface MyPluginConfig {
  webhookUrl: string;
  silent?: boolean;
}

export default class MyPlugin implements BonvoyPlugin {
  name = 'my-plugin';
  private config: MyPluginConfig;

  constructor(config: MyPluginConfig) {
    this.config = config;
  }

  apply(bonvoy: Bonvoy): void {
    bonvoy.hooks.afterRelease.tap(this.name, (context) => {
      if (!context.isDryRun) {
        // send webhook notification
      }
    });
  }
}
```

Users configure it in `bonvoy.config.js`:

```javascript
export default {
  plugins: [
    ['my-plugin', { webhookUrl: 'https://...' }],
  ],
};
```

### Async Hooks

Use `tapPromise` for async operations:

```typescript
apply(bonvoy: Bonvoy): void {
  bonvoy.hooks.afterRelease.tapPromise(this.name, async (context) => {
    await fetch(this.config.webhookUrl, {
      method: 'POST',
      body: JSON.stringify({ packages: context.changedPackages }),
    });
  });
}
```

### Available Hooks

See the [Hooks Reference](/reference/hooks) for the complete list with type signatures.
