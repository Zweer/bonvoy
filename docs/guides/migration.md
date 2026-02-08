# Migration Guide

Moving to bonvoy from another release tool? Here's how.

## From Changesets

### What Changes

| Changesets | bonvoy |
|-----------|--------|
| `npx changeset` to create change file | Conventional commits (no files needed) |
| `npx changeset version` to bump | `npx bonvoy shipit` does everything |
| `npx changeset publish` to publish | Included in `shipit` |
| `.changeset/` directory required | No change files by default |
| PR workflow mandatory | Direct release or PR — your choice |

### Steps

1. Install bonvoy:
   ```bash
   npm install -D bonvoy
   npm uninstall @changesets/cli @changesets/changelog-github
   ```

2. Remove changeset config:
   ```bash
   rm -rf .changeset
   ```

3. Update CI workflow — replace changeset commands with:
   ```bash
   npx bonvoy shipit
   ```

4. Start using conventional commits:
   ```bash
   git commit -m "feat: add new feature"   # instead of creating a changeset file
   ```

### Want to Keep Change Files?

Install `@bonvoy/plugin-changeset` — it reads `.changeset/*.md` files in the same format:

```bash
npm install -D @bonvoy/plugin-changeset
```

bonvoy reads both `.changeset/` and `.bonvoy/` directories.

## From semantic-release

### What Changes

| semantic-release | bonvoy |
|-----------------|--------|
| Fully automatic on every push | You decide when to release |
| Complex plugin config | Sensible defaults, minimal config |
| `.releaserc` with plugin chains | `bonvoy.config.js` (optional) |
| No monorepo support | Monorepo-native |

### Steps

1. Install bonvoy:
   ```bash
   npm install -D bonvoy
   npm uninstall semantic-release @semantic-release/*
   ```

2. Remove semantic-release config:
   ```bash
   rm .releaserc .releaserc.json .releaserc.yml
   ```

3. Update CI — replace `npx semantic-release` with:
   ```bash
   npx bonvoy shipit
   ```

Your conventional commits work the same way. No changes to your commit workflow.

## From release-it

### What Changes

| release-it | bonvoy |
|-----------|--------|
| Interactive prompts | Non-interactive (CI-friendly) |
| No monorepo support | Monorepo-native |
| `.release-it.json` config | `bonvoy.config.js` (optional) |
| Manual version selection | Automatic from commits or forced |

### Steps

1. Install bonvoy:
   ```bash
   npm install -D bonvoy
   npm uninstall release-it @release-it/*
   ```

2. Remove release-it config:
   ```bash
   rm .release-it.json .release-it.js
   ```

3. Update CI and scripts:
   ```bash
   npx bonvoy shipit          # automatic bump
   npx bonvoy shipit minor    # force minor (like release-it prompt)
   ```

## From release-please

### What Changes

| release-please | bonvoy |
|---------------|--------|
| PR-only workflow | Direct or PR — your choice |
| GitHub App or Action | Simple CLI |
| `release-please-config.json` | `bonvoy.config.js` (optional) |
| Complex manifest config | Zero config for common cases |

### Steps

1. Install bonvoy:
   ```bash
   npm install -D bonvoy
   ```

2. Remove release-please config:
   ```bash
   rm release-please-config.json .release-please-manifest.json
   ```

3. Remove the release-please GitHub Action and replace with:
   ```yaml
   - run: npx bonvoy shipit
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
   ```

If you want to keep the PR workflow:
```javascript
// bonvoy.config.js
export default {
  workflow: 'pr',
};
```
