# 🚀 First Release Guide

## Initial Version Strategy

All packages start at `0.0.0`. To release the first version as `0.1.0`:

```bash
# Option 1: Force specific version
npx bonvoy shipit 0.1.0

# Option 2: Use minor bump (0.0.0 → 0.1.0)
npx bonvoy shipit minor
```

## Why 0.1.0 instead of 1.0.0?

Starting with `0.1.0` signals:
- ✅ Pre-stable API (breaking changes allowed in minor versions)
- ✅ Active development phase
- ✅ Room for iteration before 1.0.0 commitment

## Version Bump Behavior

From `0.0.0`:
- `patch` → `0.0.1`
- `minor` → `0.1.0` ✅ **Recommended for first release**
- `major` → `1.0.0`

## Complete First Release Checklist

### 1. Publish dummy packages (one-time setup)
```bash
npx tsx scripts/publish-dummy.ts
```

### 2. Test dry-run
```bash
npm run build
npx bonvoy shipit 0.1.0 --dry-run
```

### 3. Create backup branch
```bash
git checkout -b pre-release-backup
git push origin pre-release-backup
git checkout main
```

### 4. Execute first release
```bash
npx bonvoy shipit 0.1.0
```

### 5. Verify release
```bash
# Check npm
npm view @bonvoy/core

# Check GitHub releases
gh release list

# Check git tags
git tag -l
```

## Subsequent Releases

After the first release, bonvoy will automatically determine version bumps from conventional commits:

```bash
# Automatic bump based on commits
npx bonvoy shipit

# Or force specific bump
npx bonvoy shipit patch
npx bonvoy shipit minor
npx bonvoy shipit major
```

## GitHub Actions

The CI/CD workflow will automatically release on push to `main` after tests pass. For manual releases with specific versions:

```bash
# Trigger via GitHub UI: Actions → CI/CD → Run workflow
# Input: 0.1.0 (or minor/major/patch)
```
