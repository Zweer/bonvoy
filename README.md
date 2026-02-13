<div align="center">
  <img src="assets/bonvoy-logo.png" alt="bonvoy logo" width="200"/>
  <h1>bonvoy</h1>
  <p><em>"Bon voyage to your releases!"</em></p>
</div>

<div align="center">

[![CI](https://github.com/Zweer/bonvoy/actions/workflows/ci.yml/badge.svg)](https://github.com/Zweer/bonvoy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage Badge](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat)

</div>

A plugin-based release automation tool for npm packages and monorepos.

**[📚 Documentation](https://zweer.github.io/bonvoy)** · [Getting Started](https://zweer.github.io/bonvoy/getting-started) · [Configuration](https://zweer.github.io/bonvoy/configuration) · [Plugins](https://zweer.github.io/bonvoy/plugins/overview)

## Why bonvoy?

| Tool | Problem |
|------|---------|
| semantic-release | Too automatic, complex plugin config |
| release-it | No monorepo support |
| changesets | Mandatory PR workflow, unpredictable bumps |
| release-please | Complex config, PR-only |

**bonvoy** gives you:
- 🔌 **Plugin architecture** — extend or replace any functionality
- 📦 **Monorepo-native** — npm workspaces out of the box
- ⚡ **Zero config** — works immediately for npm + GitHub
- 🎯 **Flexible workflows** — direct release or PR-based
- 📝 **Conventional commits** — automatic changelog from commit messages
- ↩️ **Automatic rollback** — failed releases are rolled back automatically
- 🛡️ **Validated config** — runtime validation with Zod

## Quick Start

```bash
npm install -D bonvoy
```

```bash
npx bonvoy shipit              # Release all changed packages
npx bonvoy shipit --dry-run    # Preview changes
npx bonvoy shipit minor        # Force minor bump
npx bonvoy shipit 2.0.0        # Force specific version
npx bonvoy status --all        # Show all packages with versions
npx bonvoy rollback            # Roll back a failed release
```

## How It Works

1. **Analyze commits** since the last release
2. **Calculate version bumps** per package (from conventional commits)
3. **Generate changelogs** for each changed package
4. **Publish** to npm + create GitHub releases + git tags

## GitHub Actions

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

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [@bonvoy/core](./packages/core) | [![npm](https://img.shields.io/npm/v/@bonvoy/core)](https://www.npmjs.com/package/@bonvoy/core) | Hook system, config loading, schema validation |
| [bonvoy](./packages/cli) | [![npm](https://img.shields.io/npm/v/bonvoy)](https://www.npmjs.com/package/bonvoy) | CLI orchestration and commands |
| [@bonvoy/plugin-conventional](./packages/plugin-conventional) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-conventional)](https://www.npmjs.com/package/@bonvoy/plugin-conventional) | Conventional commits parser (default) |
| [@bonvoy/plugin-changelog](./packages/plugin-changelog) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-changelog)](https://www.npmjs.com/package/@bonvoy/plugin-changelog) | Changelog generation (default) |
| [@bonvoy/plugin-git](./packages/plugin-git) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-git)](https://www.npmjs.com/package/@bonvoy/plugin-git) | Git commit, tag, push (default) |
| [@bonvoy/plugin-npm](./packages/plugin-npm) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-npm)](https://www.npmjs.com/package/@bonvoy/plugin-npm) | npm publish with OIDC (default) |
| [@bonvoy/plugin-github](./packages/plugin-github) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-github)](https://www.npmjs.com/package/@bonvoy/plugin-github) | GitHub releases (default) |
| [@bonvoy/plugin-gitlab](./packages/plugin-gitlab) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-gitlab)](https://www.npmjs.com/package/@bonvoy/plugin-gitlab) | GitLab releases (optional) |
| [@bonvoy/plugin-changeset](./packages/plugin-changeset) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-changeset)](https://www.npmjs.com/package/@bonvoy/plugin-changeset) | Changeset-compatible workflow (optional) |
| [@bonvoy/plugin-exec](./packages/plugin-exec) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-exec)](https://www.npmjs.com/package/@bonvoy/plugin-exec) | Custom shell commands (optional) |
| [@bonvoy/plugin-ai](./packages/plugin-ai) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-ai)](https://www.npmjs.com/package/@bonvoy/plugin-ai) | AI-generated release notes summary (optional) |
| [@bonvoy/plugin-notification](./packages/plugin-notification) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-notification)](https://www.npmjs.com/package/@bonvoy/plugin-notification) | Base notification plugin |
| [@bonvoy/plugin-slack](./packages/plugin-slack) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-slack)](https://www.npmjs.com/package/@bonvoy/plugin-slack) | Slack notifications (optional) |
| [@bonvoy/plugin-discord](./packages/plugin-discord) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-discord)](https://www.npmjs.com/package/@bonvoy/plugin-discord) | Discord notifications (optional) |
| [@bonvoy/plugin-telegram](./packages/plugin-telegram) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-telegram)](https://www.npmjs.com/package/@bonvoy/plugin-telegram) | Telegram notifications (optional) |
| [@bonvoy/plugin-teams](./packages/plugin-teams) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-teams)](https://www.npmjs.com/package/@bonvoy/plugin-teams) | Microsoft Teams notifications (optional) |

## Documentation

Visit the **[full documentation](https://zweer.github.io/bonvoy)** for:

- [Getting Started](https://zweer.github.io/bonvoy/getting-started) — from zero to first release in 2 minutes
- [Configuration](https://zweer.github.io/bonvoy/configuration) — all options explained
- [CLI Reference](https://zweer.github.io/bonvoy/cli) — commands and flags
- [Plugin System](https://zweer.github.io/bonvoy/plugins/overview) — how hooks work
- [Monorepo Guide](https://zweer.github.io/bonvoy/guides/monorepo) — npm workspaces setup
- [PR Workflow](https://zweer.github.io/bonvoy/guides/pr-workflow) — release-please style
- [CI/CD Guide](https://zweer.github.io/bonvoy/guides/ci-cd) — GitHub Actions + GitLab CI
- [Rollback & Recovery](https://zweer.github.io/bonvoy/guides/rollback) — automatic and manual rollback
- [Migration](https://zweer.github.io/bonvoy/guides/migration) — from changesets, semantic-release, release-it
- [Writing Plugins](https://zweer.github.io/bonvoy/guides/writing-plugins) — extend bonvoy
- [Comparison](https://zweer.github.io/bonvoy/comparison) — vs other tools

## License

MIT
