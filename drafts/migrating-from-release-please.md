# Migrating from release-please to bonvoy

[release-please](https://github.com/googleapis/release-please) is Google's release automation tool. Conventional commits, monorepo support, PR-based workflow. On paper, it checks all the boxes.

In practice, the GitHub Action experience has been rough.

## Why You Might Want to Switch

### The GitHub Action chaos

The original GitHub Action (`google-github-actions/release-please-action`) was [archived in August 2024](https://github.com/google-github-actions/release-please-action). It was migrated to `googleapis/release-please-action` with breaking changes.

The v3 to v4 migration was described as a ["nasty surprise"](https://danwakeem.medium.com/beware-the-release-please-v4-github-action-ee71ff9de151) by the community. Config format changed completely. Workflows that worked for months suddenly broke.

### PRs stop being created

A recurring issue: release-please [randomly stops creating PRs](https://github.com/googleapis/release-please/issues/1946). The release PR just... doesn't appear. You push commits, nothing happens. Debugging requires understanding release-please's internal manifest state.

### PR-only workflow

release-please only works through PRs. There's no "just release now" command. Every release requires:
1. Push commits to main
2. Wait for release-please to create/update a PR
3. Review and merge the PR
4. Wait for CI to publish

Sometimes you just want to ship a fix. bonvoy gives you both:
- `bonvoy shipit` — release now
- `bonvoy prepare` — create a release PR (like release-please)

### Complex configuration

release-please's `release-please-config.json` + `.release-please-manifest.json` is a lot of ceremony. The config format changed between v3 and v4, and the documentation doesn't always match the actual behavior.

bonvoy: zero config for the common case.

## What You'd Lose

- **Fully automated PR workflow** — release-please's PR creation is automatic on every push
- **Google backing** — it's maintained by Google's release tooling team
- **Language agnostic** — release-please supports Java, Python, Go, Ruby, not just npm
- **Manifest tracking** — release-please tracks versions in a manifest file, which can be useful for complex setups

## Side by Side

| | release-please | bonvoy |
|---|---|---|
| **Monorepo** | Yes (manifest) | Yes (workspaces) |
| **Conventional commits** | ✅ | ✅ |
| **Changelog** | ✅ | ✅ |
| **GitHub releases** | ✅ | ✅ |
| **npm publish** | Separate step | Built-in |
| **PR workflow** | Only option | Optional |
| **Direct release** | No | Yes |
| **Config** | 2 JSON files | Zero config |
| **Languages** | Many | npm only |
| **GitHub Action** | Required | Optional |

## Migration Steps

### 1. Install bonvoy, remove release-please

```bash
npm install -D bonvoy
```

Remove the release-please GitHub Action from `.github/workflows/`.

### 2. Delete config files

```bash
rm release-please-config.json .release-please-manifest.json
```

### 3. Tag current versions

Check your current versions and create tags:

```bash
# Read versions from the manifest or package.json files
git tag @my-org/core@2.1.0
git tag @my-org/utils@1.3.0
git push --tags
```

### 4. Update CI

Before (release-please):

```yaml
# Two workflows: one for PR creation, one for publishing
- uses: googleapis/release-please-action@v4
  with:
    config-file: release-please-config.json
    manifest-file: .release-please-manifest.json
```

After (bonvoy — direct release):

```yaml
- run: npx bonvoy shipit
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Or if you want to keep the PR workflow:

```yaml
# On push to main: create release PR
- run: npx bonvoy prepare
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 5. Close any open release-please PRs

release-please may have left open "chore: release" PRs. Close them — bonvoy will start fresh from the tags.

## Should You Migrate?

**Yes, if:**
- You've been bitten by the GitHub Action breaking changes
- You want the option to release without PRs
- You only release npm packages
- You want simpler configuration

**No, if:**
- You release non-npm packages (Java, Python, Go)
- The PR-only workflow is exactly what you want
- Your release-please setup is stable and working
- You need the manifest-based version tracking

## Try It

```bash
npm install -D bonvoy
npx bonvoy shipit --dry-run
```

- 📚 [Migration guide](https://zweer.github.io/bonvoy/guides/migration)
- 📚 [Documentation](https://zweer.github.io/bonvoy)
- 🐙 [GitHub](https://github.com/Zweer/bonvoy)
