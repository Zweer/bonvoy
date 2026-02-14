# Release Workflow

## Release Strategy

bonvoy uses **independent versioning** by default — each package maintains its own version based on its changes.

### When to Release

- After merging PRs to main branch
- When conventional commits indicate changes (feat, fix, perf)
- Manual trigger via GitHub Actions workflow_dispatch

### Release Types

#### Direct Release (default)
```bash
npx bonvoy shipit              # Release all changed packages
npx bonvoy shipit --dry-run    # Preview changes
npx bonvoy shipit minor        # Force minor bump
npx bonvoy shipit 2.0.0        # Force specific version
```

#### PR-based Release
```bash
npx bonvoy prepare             # Create release PR
# Review and merge PR
npx bonvoy shipit              # Publish (auto-detects merged PR)
```

## Release Process

### 1. Pre-release Checks

Before releasing:
- [ ] All tests pass (`npm test`)
- [ ] Coverage at 100% (`npm run test:coverage`)
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] No uncommitted changes
- [ ] On main branch
- [ ] Pulled latest changes

### 2. Version Determination

bonvoy analyzes commits since last release:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | minor | 1.0.0 → 1.1.0 |
| `fix:` | patch | 1.0.0 → 1.0.1 |
| `perf:` | patch | 1.0.0 → 1.0.1 |
| `feat!:` or `BREAKING CHANGE:` | major | 1.0.0 → 2.0.0 |

**Pre-1.0.0**: Breaking changes bump to 1.0.0 (graduation)

### 3. What Gets Released

Per package:
1. **Version bump** in package.json
2. **CHANGELOG.md** updated with new version section
3. **Git commit** with all changes
4. **Git tag** (format: `@scope/name@version`)
5. **npm publish** to registry
6. **GitHub release** with changelog

### 4. Rollback on Failure

If any step fails, bonvoy automatically rolls back:
- Unpublish from npm (best-effort, 72h limit)
- Delete GitHub releases
- Reset git commits and tags

Manual rollback: `npx bonvoy rollback`

## CI/CD Release

### GitHub Actions Workflow

```yaml
name: Release
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump (patch/minor/major/x.y.z)'
        required: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write      # For git push and releases
      id-token: write      # For npm OIDC
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0   # Full history for conventional commits
      
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      - run: npx bonvoy shipit ${{ github.event.inputs.bump }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**IMPORTANT**: Always use the **latest major version** of GitHub Actions:
- `actions/checkout@v6` (not v4, v3, v2)
- `actions/setup-node@v6` (not v4, v3, v2)
- Check for updates regularly

### npm Authentication

#### OIDC (recommended)
- No `NPM_TOKEN` needed
- Requires `id-token: write` permission
- Package must exist on npm (first publish needs token)

#### Token-based
```yaml
- run: npx bonvoy shipit
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Manual Release

### Local Release (not recommended)

```bash
# 1. Ensure clean state
git status                     # No uncommitted changes
git pull origin main           # Latest changes

# 2. Build and test
npm run build
npm test
npm run lint

# 3. Release
npx bonvoy shipit --dry-run    # Preview
npx bonvoy shipit              # Execute

# 4. Verify
git log --oneline -5           # Check commit
git tag                        # Check tags
npm view @bonvoy/core          # Check npm
```

**Note**: Prefer CI/CD releases for consistency and audit trail.

## Version Overrides

### Force Specific Bump
```bash
npx bonvoy shipit patch        # Force patch (1.0.0 → 1.0.1)
npx bonvoy shipit minor        # Force minor (1.0.0 → 1.1.0)
npx bonvoy shipit major        # Force major (1.0.0 → 2.0.0)
```

### Force Specific Version
```bash
npx bonvoy shipit 2.0.0        # All packages → 2.0.0
```

### Selective Release
```bash
npx bonvoy shipit --package @bonvoy/core
npx bonvoy shipit --package @bonvoy/core --package @bonvoy/cli
```

## Pre-release Channels

For alpha, beta, rc releases:

```bash
npx bonvoy shipit --prerelease alpha    # 1.0.0 → 1.0.0-alpha.0
npx bonvoy shipit --prerelease beta     # 1.0.0 → 1.0.0-beta.0
npx bonvoy shipit --prerelease rc       # 1.0.0 → 1.0.0-rc.0
```

Publishes to npm with dist-tag (e.g., `@bonvoy/core@alpha`)

## Release Checklist

### Before Release
- [ ] All PRs merged
- [ ] Tests passing
- [ ] Coverage at 100%
- [ ] Lint passing
- [ ] Build succeeds
- [ ] CHANGELOG reviewed (if manual)
- [ ] Breaking changes documented
- [ ] Migration guide written (if breaking)

### After Release
- [ ] Verify npm packages published
- [ ] Verify GitHub releases created
- [ ] Verify git tags pushed
- [ ] Test installation: `npm install -D bonvoy@latest`
- [ ] Update documentation if needed
- [ ] Announce release (Twitter, Discord, etc.)

## Troubleshooting

### Release Fails Mid-way
```bash
npx bonvoy rollback            # Automatic rollback
```

### npm Publish Fails (OIDC)
- First publish requires `NPM_TOKEN` (OIDC needs existing package)
- Check package exists: `npm view @bonvoy/package-name`

### Git Push Fails
- Check permissions: `contents: write` in workflow
- Check branch protection rules

### GitHub Release Fails
- Check `GITHUB_TOKEN` has correct permissions
- Verify repository settings allow releases

### Tag Already Exists
- bonvoy validates before release
- If validation missed: delete tag and retry
```bash
git tag -d @bonvoy/core@1.0.0
git push --delete origin @bonvoy/core@1.0.0
```

## Versioning Strategy

### Independent (default)
Each package has its own version:
```
@bonvoy/core@1.2.0
@bonvoy/cli@0.9.0
@bonvoy/plugin-git@1.0.5
```

### Fixed (optional)
All packages share same version:
```javascript
// bonvoy.config.js
export default {
  versioning: 'fixed',
};
```

### Root Package Version
```javascript
// bonvoy.config.js
export default {
  rootVersionStrategy: 'max',     // Max of all packages (default)
  // or
  rootVersionStrategy: 'patch',   // Patch bump on any change
  // or
  rootVersionStrategy: 'none',    // Don't version root
};
```

## Release Notes

### Automatic (default)
Generated from conventional commits:
```markdown
## [1.2.0] - 2026-02-14

### ✨ Features
- add rollback command

### 🐛 Bug Fixes
- handle OIDC auth failure gracefully
```

### AI-enhanced (optional)
With `@bonvoy/plugin-ai`:
```markdown
## [1.2.0] - 2026-02-14

> This release adds automatic rollback for failed releases and improves
> error messages across the board.

### ✨ Features
- add rollback command
```

## Dependencies

### Keep Dependencies Updated

**CRITICAL**: Always use the **latest stable versions** of:
- GitHub Actions (e.g., `actions/checkout@v6`)
- npm packages (run `npm outdated` regularly)
- Node.js (currently 22, update when 24 LTS is released)

### Update Process
```bash
# Check outdated packages
npm outdated

# Update all to latest
npm update

# Update major versions (requires manual review)
npm install <package>@latest

# Test after updates
npm run build
npm test
npm run lint
```

### Security Updates
- Run `npm audit` regularly
- Fix vulnerabilities immediately
- Update dependencies with security patches ASAP

## Dogfooding

bonvoy releases itself using bonvoy:
- Configuration: `bonvoy.config.ts` at root
- CI workflow: `.github/workflows/ci.yml`
- Tests the tool in real-world scenario
- Ensures reliability before users adopt

## Best Practices

### Commit Messages
- Use conventional commits (see `.kiro/skills/commit-format.md`)
- Be specific and detailed
- Include context in body

### Breaking Changes
- Document in commit body with `BREAKING CHANGE:`
- Write migration guide
- Update documentation
- Consider deprecation period

### Changelog
- Review generated changelog before release
- Edit if needed (manual mode)
- Keep format consistent

### Testing
- Test locally with `--dry-run` first
- Verify in CI before merging
- Monitor release process

### Communication
- Announce major releases
- Share breaking changes early
- Respond to issues quickly
