# FAQ

## General

### Do I need a config file?

No. bonvoy works with zero configuration for standard npm + GitHub projects.

### Does bonvoy work with single packages?

Yes. If there's no `workspaces` field in your `package.json`, bonvoy treats it as a single package.

### Does bonvoy work with pnpm/yarn workspaces?

Currently bonvoy supports npm workspaces. pnpm and yarn workspace support is planned.

### What Node.js version is required?

Node.js >= 20.5.

## Versioning

### How does bonvoy decide the version bump?

By default, it parses conventional commit messages:
- `feat:` → minor
- `fix:` / `perf:` → patch
- `feat!:` or `BREAKING CHANGE:` → major
- Everything else → no bump

### Can I force a specific version?

Yes:
```bash
bonvoy shipit 2.0.0    # exact version
bonvoy shipit major     # force major bump
bonvoy shipit minor     # force minor bump
```

### How are commits assigned to packages in a monorepo?

By the files they modified. If a commit changes `packages/core/src/index.ts`, it's assigned to the `core` package. A commit can be assigned to multiple packages.

### What if there are no changes?

bonvoy exits cleanly with "No changes detected — nothing to release".

## Git

### Does bonvoy push to the remote?

Yes, by default. Disable with:
```javascript
export default { git: { push: false } };
```

### What tags does bonvoy create?

One per released package: `@scope/core@1.2.0`. Customize with `tagFormat`.

### Does bonvoy need the full git history?

Yes. In CI, use `fetch-depth: 0` with `actions/checkout`.

## npm

### Does bonvoy need an NPM_TOKEN?

Not if you use OIDC provenance in GitHub Actions (default). The token is provided automatically.

For other CI systems or manual releases, set `NODE_AUTH_TOKEN`.

### Are private packages published?

No. Packages with `"private": true` are automatically skipped.

### What happens if a version already exists on npm?

By default (`skipExisting: true`), it's skipped. No error.

## Troubleshooting

### "No changes detected" but I have commits

Make sure your commits use conventional format (`feat:`, `fix:`, etc.). Commits like `chore:` or `docs:` don't trigger releases by default.

### Tags already exist

bonvoy validates that tags don't exist before releasing. If a tag exists from a previous partial release, delete it:
```bash
git tag -d @scope/core@1.2.0
git push origin :refs/tags/@scope/core@1.2.0
```

### Release failed halfway

Check `.bonvoy/release-log.json` for what was completed. It logs which packages were published and which tags were created, so you can manually clean up if needed.
