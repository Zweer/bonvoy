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
- ✅ Configurable access level (public/restricted)
- ✅ Custom registry support
- ✅ Dry-run support

## Configuration

```javascript
// bonvoy.config.js
export default {
  npm: {
    registry: 'https://registry.npmjs.org', // default
    access: 'public',                        // default
    provenance: true,                        // default
    skipExisting: true,                      // default
  },
};
```

## Requirements

For OIDC provenance in GitHub Actions:

```yaml
permissions:
  id-token: write
  contents: read
```

## Default Behavior

This plugin is loaded automatically by bonvoy. It runs during the `publish` hook to publish each package to npm.

## License

MIT
