# CI/CD Guide

## GitHub Actions

### Direct Release (manual trigger)

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
      - run: npm test
      - run: npx bonvoy shipit ${{ github.event.inputs.bump }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Direct Release (on push to main)

```yaml
name: Release
on:
  push:
    branches: [main]

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
      - run: npx bonvoy shipit
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### PR Workflow

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
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
      - run: npx bonvoy shipit
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### JSON Output for Downstream Jobs

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.release.outputs.result }}
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - id: release
        run: |
          RESULT=$(npx bonvoy shipit --json)
          echo "result=$RESULT" >> $GITHUB_OUTPUT
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: release
    if: fromJSON(needs.release.outputs.released).success
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy triggered by release"
```

## GitLab CI

```yaml
stages:
  - test
  - release

test:
  stage: test
  script:
    - npm ci
    - npm test

release:
  stage: release
  script:
    - npm ci
    - npx bonvoy shipit
  variables:
    GITLAB_TOKEN: $CI_JOB_TOKEN
  only:
    - main
```

## Required Permissions

### GitHub

| Permission | Required for |
|------------|-------------|
| `contents: write` | Git push, create releases |
| `id-token: write` | npm provenance (OIDC) |
| `pull-requests: write` | PR workflow only |

### npm

For OIDC provenance (recommended), no `NPM_TOKEN` is needed — GitHub Actions provides the token automatically via OIDC.

For traditional token auth, set `NODE_AUTH_TOKEN`:

```yaml
- run: npx bonvoy shipit
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Important Notes

::: warning fetch-depth: 0
Always use `fetch-depth: 0` with `actions/checkout`. bonvoy needs the full git history to find commits since the last tag.
:::

::: warning registry-url
Always set `registry-url` in `actions/setup-node`. This configures the `.npmrc` file needed for publishing.
:::
