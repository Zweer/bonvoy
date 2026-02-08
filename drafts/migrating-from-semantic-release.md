# Migrating from semantic-release to bonvoy

[semantic-release](https://github.com/semantic-release/semantic-release) is the most popular release automation tool in the npm ecosystem. It pioneered conventional commits for automatic versioning, and it works beautifully — for single packages.

If you have a monorepo, or if you want more control over when releases happen, here's how bonvoy compares and how to migrate.

## Why You Might Want to Switch

### No native monorepo support

semantic-release assumes one repo = one package. If you have a monorepo with npm workspaces, you need community plugins:

- `semantic-release-monorepo` — wraps semantic-release per package
- `multi-semantic-release` — runs semantic-release for each package

The problem? `multi-semantic-release` describes itself as a "proof of concept" and warns it "may not be fundamentally stable enough for important production use." These aren't official plugins — they're community workarounds with varying levels of maintenance.

bonvoy was built for monorepos from day one. Workspace detection, per-package changelogs, independent versioning — it's all in the core.

### Fully automatic releases

semantic-release is designed to release on every push to main. There's no "preview first" or "release when I'm ready." Every merge triggers a release.

bonvoy gives you the choice:
- `bonvoy shipit` — release now
- `bonvoy shipit --dry-run` — preview first
- `bonvoy prepare` — create a release PR instead
- `workflow_dispatch` — trigger manually from GitHub Actions

### Plugin configuration complexity

A typical semantic-release config:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { "npmPublish": true }],
    ["@semantic-release/github", { "assets": [] }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version}"
    }]
  ]
}
```

bonvoy equivalent: nothing. Zero config. All of the above is the default behavior.

## What You'd Lose

Let's be honest:

- **Maturity** — semantic-release has years of production use and edge cases handled
- **Ecosystem** — hundreds of community plugins
- **Fully automatic CI** — if you want zero-touch releases, semantic-release is purpose-built for that
- **Branch strategies** — semantic-release has sophisticated branch/channel support (beta, next, maintenance branches)

## Side by Side

| | semantic-release | bonvoy |
|---|---|---|
| **Monorepo** | Community plugins | Native |
| **Conventional commits** | ✅ | ✅ |
| **Changelog** | Plugin | Default |
| **GitHub releases** | Plugin | Default |
| **npm publish** | Plugin | Default |
| **Config needed** | Yes (plugins list) | No |
| **Release trigger** | Automatic (on push) | Manual or automatic |
| **Dry run** | `--dry-run` | `--dry-run` |
| **PR workflow** | No | Yes |
| **Branch strategies** | Advanced | Basic (main branch) |

## Migration Steps

### 1. Install bonvoy, remove semantic-release

```bash
npm install -D bonvoy
npm uninstall semantic-release @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator @semantic-release/changelog \
  @semantic-release/npm @semantic-release/github @semantic-release/git
```

### 2. Delete config

Remove `.releaserc`, `.releaserc.json`, `.releaserc.yml`, or the `release` key from `package.json`.

### 3. Tag current version

bonvoy uses git tags to find the last release:

```bash
# Single package
git tag v1.5.0
# Or monorepo
git tag @my-org/core@1.5.0
git push --tags
```

### 4. Update CI

Before:

```yaml
- run: npx semantic-release
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

Note: bonvoy supports npm OIDC provenance — no `NPM_TOKEN` needed if your registry supports it.

### 5. (Optional) Switch to manual trigger

If you want to control when releases happen:

```yaml
on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump (patch/minor/major/x.y.z)'
        required: false
```

## Should You Migrate?

**Yes, if:**
- You have a monorepo (or plan to)
- You want control over release timing
- You're tired of configuring 6 plugins for basic functionality

**No, if:**
- You want fully automatic releases on every push
- You need advanced branch strategies (beta/next channels)
- You're happy with your current setup

## Try It

```bash
npm install -D bonvoy
npx bonvoy shipit --dry-run
```

- 📚 [Migration guide](https://zweer.github.io/bonvoy/guides/migration)
- 📚 [Documentation](https://zweer.github.io/bonvoy)
- 🐙 [GitHub](https://github.com/Zweer/bonvoy)
