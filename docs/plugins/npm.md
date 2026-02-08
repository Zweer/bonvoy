# plugin-npm

> `@bonvoy/plugin-npm` — Default plugin

Publishes packages to the npm registry with OIDC provenance support.

## Configuration

```javascript
export default {
  npm: {
    registry: 'https://registry.npmjs.org',  // default
    access: 'public',                         // default
    skipExisting: true,                       // default
    provenance: true,                         // default
  },
};
```

### `registry`

npm registry URL. Change for GitHub Packages or private registries:

```javascript
export default {
  npm: {
    registry: 'https://npm.pkg.github.com',
  },
};
```

### `access`

- `'public'` — anyone can install (default)
- `'restricted'` — only authorized users

::: warning
Scoped packages (e.g., `@bonvoy/core`) default to `restricted` on npm. Set `'public'` explicitly to publish them publicly.
:::

### `skipExisting`

When `true`, skips publishing if the version already exists on the registry instead of failing.

### `provenance`

Enable [npm provenance statements](https://docs.npmjs.com/generating-provenance-statements) for supply chain security. Links published packages to their source code and build.

Requires in GitHub Actions:

```yaml
permissions:
  id-token: write
```

## Hook

| Hook | Action |
|------|--------|
| `publish` | Publishes each changed package to npm |

## Behavior

For each changed package:

1. Skip if `"private": true` in package.json
2. Skip if version already exists on registry (when `skipExisting: true`)
3. Run `npm publish --access <access> --provenance`

## Prerelease Tags

When publishing a prerelease version (e.g., `1.0.0-beta.0`), the npm dist-tag is set automatically:

| Version | npm tag |
|---------|---------|
| `1.0.0` | `latest` |
| `1.0.0-beta.0` | `beta` |
| `1.0.0-alpha.1` | `alpha` |
| `1.0.0-rc.0` | `rc` |
| `1.0.0-next.0` | `next` |

This prevents prereleases from becoming the default `latest` tag.
