# Zero-Config Monorepo Releases in 2 Minutes

What if releasing your monorepo was as simple as one command?

No config files. No change files. No PR workflows. Just:

```bash
npx bonvoy shipit
```

Let me show you.

## What We're Building

A monorepo with two packages, released independently with proper changelogs, git tags, and npm publishes — all from conventional commits.

## 1. Create the Monorepo

```bash
mkdir my-monorepo && cd my-monorepo
npm init -y
```

Add workspaces to `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["packages/*"]
}
```

Create two packages:

```bash
mkdir -p packages/core packages/utils

# packages/core/package.json
cat > packages/core/package.json << 'EOF'
{
  "name": "@my-org/core",
  "version": "1.0.0",
  "main": "index.js"
}
EOF

# packages/utils/package.json
cat > packages/utils/package.json << 'EOF'
{
  "name": "@my-org/utils",
  "version": "1.0.0",
  "main": "index.js"
}
EOF

echo "module.exports = {}" > packages/core/index.js
echo "module.exports = {}" > packages/utils/index.js
```

## 2. Install bonvoy

```bash
npm install -D bonvoy
```

That's it. No config file needed.

## 3. Make Some Commits

Initialize git and make a few conventional commits:

```bash
git init
git add -A
git commit -m "chore: initial commit"
git tag @my-org/core@1.0.0
git tag @my-org/utils@1.0.0
```

Now make changes:

```bash
echo "module.exports = { add: (a, b) => a + b }" > packages/utils/index.js
git add -A
git commit -m "feat: add math utilities"

echo "const utils = require('@my-org/utils')" > packages/core/index.js
git add -A
git commit -m "fix: use utils in core"
```

## 4. Preview the Release

```bash
npx bonvoy shipit --dry-run
```

bonvoy will:
1. Find commits since the last tags
2. Assign them to packages by file paths
3. Calculate version bumps from conventional commit types
4. Show you exactly what would happen

```
🚢 bonvoy — dry run

📦 @my-org/utils
   1.0.0 → 1.1.0 (minor)
   ✨ Features
     • add math utilities

📦 @my-org/core
   1.0.0 → 1.0.1 (patch)
   🐛 Bug Fixes
     • use utils in core

Would commit, tag, publish, and create GitHub releases.
```

`feat:` → minor bump for utils. `fix:` → patch bump for core. Each package gets only its own changes.

## 5. Release

When you're ready:

```bash
npx bonvoy shipit
```

bonvoy will:
- Update `package.json` versions
- Generate `CHANGELOG.md` for each package
- Commit with `chore: :bookmark: release`
- Create git tags (`@my-org/core@1.0.1`, `@my-org/utils@1.1.0`)
- Publish to npm
- Create GitHub releases with changelogs

## 6. Add CI

```yaml
# .github/workflows/release.yml
name: Release
on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump (patch/minor/major/x.y.z)'
        required: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npx bonvoy shipit ${{ github.event.inputs.bump }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Push, go to Actions, click "Run workflow". Done.

## What Just Happened?

With zero configuration, bonvoy:

- **Detected workspaces** from your `package.json`
- **Parsed conventional commits** to determine version bumps
- **Assigned commits to packages** by which files they touched
- **Generated changelogs** grouped by commit type
- **Published independently** — only changed packages get released

No `.changeset/` files. No release PRs. No config file. Just conventional commits and one command.

## Customizing (When You Need To)

bonvoy works without config, but you can customize everything:

```javascript
// bonvoy.config.js
export default {
  versioning: 'fixed',           // all packages share same version
  tagFormat: 'v{version}',       // simpler tags
  changelog: { global: true },   // also generate root CHANGELOG.md
  workflow: 'pr',                // PR-based instead of direct
};
```

## Next Steps

- 📚 [Full documentation](https://zweer.github.io/bonvoy)
- 🔌 [Plugin system](https://zweer.github.io/bonvoy/plugins/overview) — extend any behavior
- 🔄 [PR workflow](https://zweer.github.io/bonvoy/guides/pr-workflow) — release-please style
- 🚀 [CI/CD guide](https://zweer.github.io/bonvoy/guides/ci-cd) — GitHub Actions + GitLab CI

Questions? [Open an issue](https://github.com/Zweer/bonvoy/issues) or find me on [GitHub](https://github.com/Zweer).
