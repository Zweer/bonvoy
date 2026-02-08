# How I Built a Plugin System with Tapable (And You Can Too)

webpack's secret weapon isn't webpack — it's [tapable](https://github.com/webpack/tapable).

Tapable is the hook library that powers webpack's entire plugin system. It's tiny (3KB), has zero dependencies, and it's the most battle-tested plugin architecture in the JavaScript ecosystem. Every webpack build you've ever run was orchestrated by tapable.

When I built [bonvoy](https://github.com/Zweer/bonvoy), a release automation tool, I needed a plugin system. I could have used EventEmitter. I could have rolled my own. Instead, I used tapable — and it was the best architectural decision in the project.

Here's how it works, and how you can add a plugin system to any tool.

## Why Not EventEmitter?

Node's `EventEmitter` is fine for fire-and-forget events. But for a plugin system, you need more:

| Feature | EventEmitter | Tapable |
|---------|-------------|---------|
| Async support | Manual (callbacks) | Built-in (async/promise) |
| Waterfall (pass data through plugins) | No | Yes |
| Bail (stop on first result) | No | Yes |
| Typed hooks | No | Yes (with TypeScript) |
| Execution order guarantee | Insertion order | Insertion order + stages |

The killer feature is **waterfall hooks**: data flows through each plugin, and each one can modify it before passing it to the next. This is how webpack transforms modules — and how bonvoy transforms configs, changelogs, and version bumps.

## The Basics

Install tapable:

```bash
npm install tapable
```

Create a hook:

```typescript
import { SyncHook } from 'tapable';

const hook = new SyncHook<[string]>(['name']);

// Register a handler
hook.tap('MyPlugin', (name) => {
  console.log(`Hello, ${name}!`);
});

// Call the hook
hook.call('world');
// → Hello, world!
```

That's the core idea. You define hooks, plugins tap into them, and your code calls them at the right time.

## Hook Types

Tapable provides several hook types. The three you'll use most:

### SyncHook / AsyncSeriesHook

Fire-and-forget. Every handler runs, return values are ignored.

```typescript
import { AsyncSeriesHook } from 'tapable';

const onSave = new AsyncSeriesHook<[{ path: string }]>(['context']);

onSave.tapPromise('Logger', async (ctx) => {
  console.log(`Saving ${ctx.path}`);
});

onSave.tapPromise('Validator', async (ctx) => {
  if (!ctx.path) throw new Error('Path required');
});

await onSave.promise({ path: '/tmp/file.txt' });
// Both handlers run in order
```

### AsyncSeriesWaterfallHook

Each handler receives the previous handler's return value. Perfect for transformations.

```typescript
import { AsyncSeriesWaterfallHook } from 'tapable';

const modifyConfig = new AsyncSeriesWaterfallHook<[Config]>(['config']);

modifyConfig.tap('Defaults', (config) => {
  return { ...config, verbose: config.verbose ?? false };
});

modifyConfig.tap('EnvOverride', (config) => {
  if (process.env.VERBOSE) return { ...config, verbose: true };
  return config;
});

const finalConfig = await modifyConfig.promise({ port: 3000 });
// Each plugin transforms the config, passing it to the next
```

### AsyncSeriesBailHook

Stops at the first handler that returns a non-undefined value. Good for "first one wins" logic.

```typescript
import { AsyncSeriesBailHook } from 'tapable';

const resolve = new AsyncSeriesBailHook<[string], string>(['request']);

resolve.tap('Cache', (req) => cache.get(req));       // returns if cached
resolve.tap('FileSystem', (req) => fs.readFile(req)); // runs only if cache missed
```

## Building a Plugin System

Here's the pattern. Three pieces:

### 1. Define your hooks

```typescript
import { AsyncSeriesHook, AsyncSeriesWaterfallHook } from 'tapable';

class MyTool {
  hooks = {
    beforeRun:  new AsyncSeriesHook<[Context]>(['context']),
    transform:  new AsyncSeriesWaterfallHook<[Data]>(['data']),
    afterRun:   new AsyncSeriesHook<[Context]>(['context']),
  };

  async run() {
    const context = { startedAt: Date.now() };
    await this.hooks.beforeRun.promise(context);

    let data = await this.loadData();
    data = await this.hooks.transform.promise(data);

    await this.hooks.afterRun.promise(context);
    return data;
  }
}
```

### 2. Define the plugin interface

```typescript
interface Plugin {
  name: string;
  apply(tool: MyTool): void;
}
```

That's it. A plugin is an object with a `name` and an `apply` method that receives the tool instance and taps into its hooks.

### 3. Write plugins

```typescript
const TimingPlugin: Plugin = {
  name: 'timing',
  apply(tool) {
    let start: number;

    tool.hooks.beforeRun.tap('timing', (ctx) => {
      start = Date.now();
    });

    tool.hooks.afterRun.tap('timing', (ctx) => {
      console.log(`Completed in ${Date.now() - start}ms`);
    });
  },
};

const UppercasePlugin: Plugin = {
  name: 'uppercase',
  apply(tool) {
    tool.hooks.transform.tap('uppercase', (data) => {
      return { ...data, text: data.text.toUpperCase() };
    });
  },
};
```

### Wire it up

```typescript
const tool = new MyTool();
tool.use(TimingPlugin);
tool.use(UppercasePlugin);
await tool.run();
```

Plugins are isolated. They don't know about each other. They only interact through hooks.

## How bonvoy Uses This

bonvoy's core is exactly this pattern. The `Bonvoy` class defines hooks for the entire release lifecycle:

```typescript
import { AsyncSeriesHook, AsyncSeriesWaterfallHook } from 'tapable';

class Bonvoy {
  hooks = {
    modifyConfig:      new AsyncSeriesWaterfallHook(['config']),
    beforeShipIt:      new AsyncSeriesHook(['context']),
    validateRepo:      new AsyncSeriesHook(['context']),
    getVersion:        new AsyncSeriesWaterfallHook(['context']),
    version:           new AsyncSeriesHook(['versionContext']),
    generateChangelog: new AsyncSeriesWaterfallHook(['changelogContext']),
    publish:           new AsyncSeriesHook(['publishContext']),
    makeRelease:       new AsyncSeriesHook(['releaseContext']),
    // ... more hooks
  };

  use(plugin: BonvoyPlugin) {
    this.plugins.push(plugin);
    plugin.apply(this);
  }
}
```

Each plugin owns one piece of the release:

- **plugin-conventional** taps `getVersion` — parses commits, returns a semver bump
- **plugin-changelog** taps `generateChangelog` — turns commits into markdown
- **plugin-npm** taps `publish` — runs `npm publish`
- **plugin-github** taps `makeRelease` — creates GitHub releases

The core doesn't know how versions are calculated, how changelogs are formatted, or where packages are published. It just calls hooks in order. Plugins do the work.

This means you can swap any piece. Don't use GitHub? Replace `plugin-github` with `plugin-gitlab`. Don't want conventional commits? Use `plugin-changeset` instead. Want to run a custom script after publishing? Write a 10-line plugin.

## Writing a bonvoy Plugin

Here's a real example — a plugin that sends a Slack message after a release:

```typescript
import type { BonvoyPlugin } from '@bonvoy/core';

export default class SlackPlugin implements BonvoyPlugin {
  name = 'slack';

  constructor(private webhookUrl: string) {}

  apply(bonvoy) {
    bonvoy.hooks.afterRelease.tapPromise(this.name, async (context) => {
      const packages = context.packages
        .filter(p => p.released)
        .map(p => `${p.name}@${p.version}`)
        .join(', ');

      await fetch(this.webhookUrl, {
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

Register it:

```javascript
// bonvoy.config.js
import SlackPlugin from './plugins/slack.js';

export default {
  plugins: [
    new SlackPlugin('https://hooks.slack.com/services/...'),
  ],
};
```

## Testing Plugins

Since plugins just tap into hooks, testing is straightforward — create a `Bonvoy` instance, register your plugin, call the hook:

```typescript
import { Bonvoy } from '@bonvoy/core';
import SlackPlugin from './slack.js';

test('sends slack notification after release', async () => {
  const bonvoy = new Bonvoy();
  const plugin = new SlackPlugin('https://hooks.slack.com/test');
  bonvoy.use(plugin);

  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response());

  await bonvoy.hooks.afterRelease.promise({
    packages: [{ name: '@my/pkg', version: '1.2.0', released: true }],
  });

  expect(fetchSpy).toHaveBeenCalledWith(
    'https://hooks.slack.com/test',
    expect.objectContaining({ method: 'POST' }),
  );
});
```

No mocking the entire tool. No integration tests needed. Just call the hook and assert.

## The Pattern

If you're building any tool that needs extensibility, here's the recipe:

1. **Define lifecycle hooks** — what are the key moments in your tool's execution?
2. **Use tapable** — `AsyncSeriesHook` for side effects, `AsyncSeriesWaterfallHook` for transformations
3. **Define a plugin interface** — `{ name: string, apply(tool): void }`
4. **Call hooks in your core** — the core orchestrates, plugins implement
5. **Ship default plugins** — so it works out of the box

The core stays small. Plugins stay focused. Users can extend or replace anything.

That's how webpack does it. That's how bonvoy does it. And now you can too.

## Links

- [tapable on GitHub](https://github.com/webpack/tapable)
- [bonvoy — plugin-based release tool](https://github.com/Zweer/bonvoy)
- [Writing bonvoy plugins](https://zweer.github.io/bonvoy/guides/writing-plugins)
- [bonvoy hooks reference](https://zweer.github.io/bonvoy/reference/hooks)
