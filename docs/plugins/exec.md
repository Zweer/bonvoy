# plugin-exec

> `@bonvoy/plugin-exec` — Optional plugin

Run custom shell commands at any point in the release lifecycle.

## Installation

```bash
npm install -D @bonvoy/plugin-exec
```

## Usage

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforePublish: 'npm run build',
      afterRelease: 'echo "Released!"',
    }]
  ],
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
| `beforeRelease` | Before GitHub/GitLab release |
| `afterRelease` | After release completes |

## Examples

### Build before publish

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforePublish: 'npm run build',
    }]
  ],
};
```

### Run tests and build

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforePublish: 'npm run lint && npm run build && npm run test',
    }]
  ],
};
```

### Send a webhook

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      afterRelease: 'curl -X POST https://hooks.example.com/release -d "done"',
    }]
  ],
};
```

## Behavior

- Commands run with full shell support (pipes, redirects, `&&`, etc.)
- Commands are **skipped** in dry-run mode
- Commands are logged before execution
- If a command fails, the release process stops
