# Single Package Guide

bonvoy works great for single-package repos too.

## Setup

```bash
npm install -D bonvoy
```

No config file needed.

## Release

```bash
# Automatic bump from commits
npx bonvoy shipit

# Or force a bump
npx bonvoy shipit patch
npx bonvoy shipit minor
npx bonvoy shipit 1.0.0
```

## What Happens

1. Reads commits since the last git tag
2. Determines the bump from conventional commits
3. Updates `package.json` version
4. Generates/updates `CHANGELOG.md`
5. Commits, tags, pushes
6. Publishes to npm
7. Creates a GitHub release

## Tag Format

For single packages, you might prefer simpler tags:

```javascript
// bonvoy.config.js
export default {
  tagFormat: 'v{version}',  // v1.2.0 instead of my-package@1.2.0
};
```

## GitHub Actions

```yaml
name: Release
on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump'
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
