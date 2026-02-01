# @bonvoy/plugin-npm 🚢

> npm publishing plugin for bonvoy

Publishes packages to the npm registry with OIDC provenance support.

## Installation

```bash
npm install @bonvoy/plugin-npm
```

## Features

- ✅ Publishes packages to npm registry
- ✅ OIDC provenance support for supply chain security
- ✅ Skips already published versions
- ✅ Skips private packages
- ✅ Configurable access level (public/restricted)
- ✅ Custom registry support
- ✅ Dry-run support

## Configuration

```javascript
// bonvoy.config.js
export default {
  npm: {
    registry: 'https://registry.npmjs.org', // default
    access: 'public',                        // default for scoped packages
    provenance: true,                        // default in CI
    skipExisting: true,                      // default
  },
};
```

## Hooks

This plugin taps into the following hooks:

| Hook | Action |
|------|--------|
| `publish` | Publishes packages to npm registry |

## Requirements

For OIDC provenance in GitHub Actions:

```yaml
permissions:
  id-token: write
  contents: read
```

## Behavior

During the `publish` hook:

1. Checks if package is private (skips if true)
2. Checks if version already exists on npm (skips if true)
3. Publishes with `npm publish --access public --provenance`

## Private Packages

Packages with `"private": true` in package.json are automatically skipped.

## Scoped Packages

Scoped packages (e.g., `@bonvoy/core`) default to `restricted` access on npm. Set `access: 'public'` to publish publicly.

## Custom Registry

```javascript
export default {
  npm: {
    registry: 'https://npm.pkg.github.com',
  },
};
```

## License

MIT
