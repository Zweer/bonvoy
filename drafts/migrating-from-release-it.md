# Migrating from release-it to bonvoy

[release-it](https://github.com/release-it/release-it) is a great tool. Interactive prompts, clean plugin system, solid single-package workflow. I used it and liked it.

Then I needed monorepo support.

## Why You Might Want to Switch

### No monorepo support

The maintainer has been clear about this. In [issue #831](https://github.com/release-it/release-it/issues/831): "There is no built-in support for monorepos in release-it." Follow-up requests (#858, #516) got the same answer.

If you have one package, release-it is excellent. If you have multiple packages in a monorepo, you need workarounds — running release-it per package with scripts, or using `release-it-lerna-changelog`. None of these are first-class.

bonvoy detects npm workspaces automatically and releases each package independently based on which files changed.

### Empty releases

release-it can [publish releases when nothing changed](https://github.com/release-it/release-it/issues/683). If your CI triggers release-it and there are no meaningful commits, it may still bump and publish.

bonvoy checks for actual changes. No conventional commits since the last tag? No release.

### Interactive by default

release-it's interactive prompts are great locally but awkward in CI. You need `--ci` flag and careful config to make it non-interactive.

bonvoy is CI-first. No prompts. Deterministic output. `--json` flag for machine-readable results.

## What You'd Lose

- **Interactive mode** — release-it's prompts are genuinely nice for manual releases
- **Hooks flexibility** — release-it has before/after hooks for every step as simple shell commands
- **Maturity** — release-it has been around longer with more edge cases handled
- **Non-npm support** — release-it can release anything (not just npm packages)

## Side by Side

| | release-it | bonvoy |
|---|---|---|
| **Monorepo** | No | Native |
| **Conventional commits** | Plugin | Default |
| **Changelog** | Plugin | Default |
| **GitHub releases** | Built-in | Default |
| **npm publish** | Built-in | Default |
| **Interactive** | Yes (default) | No (CI-first) |
| **Dry run** | `--dry-run` | `--dry-run` |
| **PR workflow** | No | Yes |
| **Custom hooks** | Shell commands | Plugin system (tapable) |
| **Non-npm packages** | Yes | No (npm only) |

## Migration Steps

### 1. Install bonvoy, remove release-it

```bash
npm install -D bonvoy
npm uninstall release-it @release-it/conventional-changelog \
  @release-it/bumper release-it-lerna-changelog
```

### 2. Delete config

Remove `.release-it.json`, `.release-it.yml`, `.release-it.toml`, or the `release-it` key from `package.json`.

### 3. Tag current version

```bash
# If you used v-prefixed tags
git tag @my-org/core@1.5.0  # bonvoy default format
git push --tags
```

### 4. Migrate hooks

If you had release-it hooks like:

```json
{
  "hooks": {
    "before:bump": "npm test",
    "after:release": "echo 'Released ${version}'"
  }
}
```

Use bonvoy's exec plugin or inline hooks:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-exec', {
      beforeShipIt: 'npm test',
      afterRelease: 'echo "Released!"',
    }],
  ],
};
```

### 5. Update CI

Before:

```yaml
- run: npx release-it --ci --no-increment
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

After:

```yaml
- run: npx bonvoy shipit
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Should You Migrate?

**Yes, if:**
- You have (or plan to have) a monorepo
- You want conventional commits to drive releases automatically
- You prefer CI-first over interactive workflows

**No, if:**
- You have a single package and like interactive releases
- You release non-npm artifacts (Docker images, binaries, etc.)
- Your current setup works and you don't need monorepo support

## Try It

```bash
npm install -D bonvoy
npx bonvoy shipit --dry-run
```

- 📚 [Migration guide](https://zweer.github.io/bonvoy/guides/migration)
- 📚 [Documentation](https://zweer.github.io/bonvoy)
- 🐙 [GitHub](https://github.com/Zweer/bonvoy)
