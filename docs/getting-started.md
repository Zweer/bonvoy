# Getting Started

Get from zero to your first release in under 2 minutes.

## Installation

```bash
npm install -D bonvoy
```

This installs the core package, which includes all default plugins:
- **conventional** — parse conventional commits for version bumps
- **changelog** — generate CHANGELOG.md
- **git** — commit, tag, push
- **npm** — publish to npm registry
- **github** — create GitHub releases

## Your First Release

### 1. Make sure you have conventional commits

bonvoy reads your git history to determine what changed:

```bash
git commit -m "feat: add user authentication"   # → minor bump
git commit -m "fix: resolve login bug"           # → patch bump
git commit -m "feat!: remove legacy API"         # → major bump
```

### 2. Preview the release

```bash
npx bonvoy shipit --dry-run
```

This shows you exactly what would happen without making any changes:
- Which packages changed
- What version each gets bumped to
- What the changelog looks like

### 3. Release

```bash
npx bonvoy shipit
```

That's it. bonvoy will:

1. **Analyze commits** since the last release
2. **Calculate version bumps** per package (based on conventional commits)
3. **Generate changelogs** for each changed package
4. **Update package.json** versions (including internal dependencies)
5. **Commit and tag** the changes
6. **Publish to npm** with provenance
7. **Create GitHub releases** with changelog bodies

## Force a Specific Version

Don't want automatic bumps? Force it:

```bash
npx bonvoy shipit patch          # Force patch bump
npx bonvoy shipit minor          # Force minor bump
npx bonvoy shipit major          # Force major bump
npx bonvoy shipit 2.0.0          # Force exact version
```

## Prereleases

```bash
npx bonvoy shipit prerelease --preid beta    # 1.0.0 → 1.0.1-beta.0
npx bonvoy shipit prerelease --preid beta    # 1.0.1-beta.0 → 1.0.1-beta.1
npx bonvoy shipit patch                      # 1.0.1-beta.1 → 1.0.1 (graduate)
```

## Monorepo

If your project uses npm workspaces, bonvoy detects it automatically. Each package gets its own version based on which files changed in each commit.

```
my-monorepo/
├── packages/
│   ├── core/        # Only bumped if files in packages/core/ changed
│   ├── utils/       # Only bumped if files in packages/utils/ changed
│   └── cli/         # Only bumped if files in packages/cli/ changed
└── package.json     # workspaces: ["packages/*"]
```

No extra config needed.

## CI/CD

Add to your GitHub Actions workflow:

```yaml
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

::: tip
`fetch-depth: 0` is required so bonvoy can read the full git history.
:::

## What's Next?

- [Configuration](/configuration) — customize bonvoy's behavior
- [CLI Reference](/cli) — all available commands and options
- [Plugins](/plugins/overview) — understand the plugin system
- [Monorepo Guide](/guides/monorepo) — advanced monorepo setup
- [PR Workflow](/guides/pr-workflow) — release-please style workflow
- [CI/CD Guide](/guides/ci-cd) — complete CI/CD setup
