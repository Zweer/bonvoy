# Migrating from auto + lerna to bonvoy

[auto](https://github.com/intuit/auto) by Intuit is a clever tool — label-based releases, great GitHub integration, solid plugin system. Paired with [lerna](https://github.com/lerna/lerna) for monorepo support, it seemed like the perfect combo.

I used it at work for about a year. I even contributed PRs to auto. Eventually, I gave up.

## Why You Might Want to Switch

### Lerna dependency hell

auto relies on lerna for monorepo support. Lerna had a persistent issue with conventional commits — specific version combinations would break the parser entirely ([lerna#1934](https://github.com/lerna/lerna/issues/1934)). You had to pin exact versions and pray nobody ran `npm update`.

Lerna was abandoned by its original maintainer, then adopted by the Nrwl/Nx team. The fundamental issues improved, but the tight coupling between auto and lerna remained fragile.

bonvoy has no lerna dependency. It reads npm workspaces directly from `package.json`.

### Phantom releases

Two separate problems:
1. auto would sometimes [create wrong version tags](https://github.com/intuit/auto/issues/596) in lerna monorepos
2. lerna would [publish packages that hadn't changed](https://github.com/lerna/lerna/issues/1357) ([#912](https://github.com/lerna/lerna/issues/912))

bonvoy assigns commits to packages by file paths. If no files changed in a package's directory, it doesn't get released.

### Label-based workflow

auto uses GitHub labels to determine version bumps. `major`, `minor`, `patch` labels on PRs. This means:
- Every PR needs a label (or the bot complains)
- Someone has to decide the label (human judgment, not mechanical)
- You need a PR for every release (no direct releases)

bonvoy uses conventional commits. The bump is determined by the commit type — `feat:` = minor, `fix:` = patch, `BREAKING CHANGE` = major. No labels, no PRs required.

### PR-dependent

auto is designed around PRs. No PR = no release. For solo developers or quick fixes, this adds friction.

bonvoy works with or without PRs. `bonvoy shipit` releases from whatever commits exist since the last tag.

## What You'd Lose

- **Label-based control** — labels are visible and reviewable in PRs
- **auto's plugin ecosystem** — auto has plugins for Slack, Chrome Web Store, Cocoapods, etc.
- **Canary releases** — auto has built-in canary release support
- **Intuit backing** — auto is maintained by Intuit's open source team

## Side by Side

| | auto + lerna | bonvoy |
|---|---|---|
| **Monorepo** | Via lerna | Native (npm workspaces) |
| **Version strategy** | Labels on PRs | Conventional commits |
| **Changelog** | ✅ | ✅ |
| **GitHub releases** | ✅ | ✅ |
| **npm publish** | Via lerna | Built-in |
| **PR required** | Yes | No |
| **Canary releases** | Built-in | Not yet |
| **Config** | `.autorc` + `lerna.json` | Zero config |
| **Dependencies** | auto + lerna | bonvoy only |

## Migration Steps

### 1. Install bonvoy, remove auto + lerna

```bash
npm install -D bonvoy
npm uninstall auto @auto-it/conventional-commits @auto-it/npm lerna
```

### 2. Delete config files

```bash
rm .autorc lerna.json
```

If you have a `lerna.json` with `"useWorkspaces": true`, bonvoy already reads workspaces from `package.json` — no config needed.

### 3. Tag current versions

```bash
# Check your current tags format and create bonvoy-compatible ones
git tag @my-org/core@1.5.0
git tag @my-org/utils@1.3.0
git push --tags
```

### 4. Switch from labels to conventional commits

This is the biggest change. Your team needs to write conventional commit messages:

| Before (label) | After (commit) |
|---|---|
| `major` label on PR | `feat!: breaking change` or `BREAKING CHANGE:` footer |
| `minor` label on PR | `feat: add feature` |
| `patch` label on PR | `fix: fix bug` |

If your team already writes descriptive commit messages, this is mostly a formatting change.

### 5. Update CI

Before:

```yaml
- run: npx auto shipit
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

### 6. Remove GitHub labels

You can remove the `major`, `minor`, `patch`, `skip-release`, `internal`, `documentation` labels that auto uses. Or keep them for other purposes — they won't interfere.

## Should You Migrate?

**Yes, if:**
- You're fighting lerna dependency issues
- You're getting phantom releases
- You want to use conventional commits instead of labels
- You want to release without PRs sometimes

**No, if:**
- Your auto + lerna setup is stable (if it ain't broke...)
- You prefer label-based version control over conventional commits
- You need canary releases
- You release non-npm packages through auto plugins

## Try It

```bash
npm install -D bonvoy
npx bonvoy shipit --dry-run
```

- 📚 [Migration guide](https://zweer.github.io/bonvoy/guides/migration)
- 📚 [Documentation](https://zweer.github.io/bonvoy)
- 🐙 [GitHub](https://github.com/Zweer/bonvoy)
