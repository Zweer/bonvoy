# @bonvoy/plugin-exec 🚢

> Execute custom shell commands during release lifecycle

Optional plugin for bonvoy that lets you run shell commands at various points in the release process.

## Features

- 🔧 **Lifecycle Hooks** - Run commands before/after any release phase
- 🐚 **Shell Support** - Full shell syntax (pipes, redirects, etc.)
- 🔍 **Dry Run** - Commands are skipped in dry-run mode
- 📝 **Logging** - Commands are logged before execution

## Installation

```bash
npm install -D @bonvoy/plugin-exec
```

## Usage

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforePublish: 'npm run build',
      afterRelease: 'echo "Released!" | slack-notify',
    }]
  ]
};
```

## Available Hooks

| Hook | When |
|------|------|
| `beforeShipIt` | Before release starts |
| `afterVersion` | After versions are bumped |
| `beforeChangelog` | Before changelog generation |
| `afterChangelog` | After changelog is written |
| `beforePublish` | Before npm publish |
| `afterPublish` | After npm publish |
| `beforeRelease` | Before GitHub release |
| `afterRelease` | After release completes |

## Examples

### Build before publish

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforePublish: 'npm run build',
    }]
  ]
};
```

### Notify on release

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      afterRelease: 'curl -X POST https://hooks.slack.com/... -d "Released!"',
    }]
  ]
};
```

### Multiple commands

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforePublish: 'npm run lint && npm run build && npm run test',
    }]
  ]
};
```

## License

MIT
