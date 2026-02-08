# Comparison

How bonvoy compares to other release tools.

## Feature Matrix

| Feature | bonvoy | changesets | semantic-release | release-it | release-please |
|---------|--------|-----------|-----------------|-----------|---------------|
| Zero config | ✅ | ❌ | ❌ | ❌ | ❌ |
| Monorepo | ✅ | ✅ | ⚠️ plugin | ❌ | ✅ |
| Independent versioning | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Fixed versioning | ✅ | ✅ | ❌ | ❌ | ✅ |
| Conventional commits | ✅ | ❌ | ✅ | ✅ | ✅ |
| Change files | ✅ optional | ✅ required | ❌ | ❌ | ❌ |
| Direct release | ✅ | ❌ | ✅ | ✅ | ❌ |
| PR workflow | ✅ | ✅ | ❌ | ❌ | ✅ |
| Plugin system | ✅ tapable | ❌ | ✅ | ✅ | ❌ |
| GitHub releases | ✅ | ❌ | ✅ | ✅ | ✅ |
| GitLab support | ✅ | ❌ | ✅ | ✅ | ❌ |
| npm provenance | ✅ | ✅ | ✅ | ✅ | ❌ |
| Dry run | ✅ | ❌ | ✅ | ✅ | ❌ |
| Prerelease | ✅ | ✅ | ✅ | ✅ | ✅ |
| Force version | ✅ | ❌ | ❌ | ✅ | ❌ |
| JSON output | ✅ | ❌ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ❌ | ✅ | ❌ | ❌ |

## When to Use bonvoy

✅ **Use bonvoy when:**
- You want a tool that works out of the box
- You have a monorepo with npm workspaces
- You want flexibility (direct release OR PR workflow)
- You use conventional commits
- You want to extend behavior with plugins
- You want both GitHub and GitLab support

## When NOT to Use bonvoy

❌ **Consider alternatives when:**
- You need non-npm package managers (pnpm workspaces, yarn workspaces with PnP)
- You need a mature, battle-tested tool for enterprise (semantic-release)
- Your team is already happy with changesets
- You need interactive prompts (release-it)

## Detailed Comparisons

### vs Changesets

**Changesets** requires creating change files for every PR. This is great for large teams but adds friction for small teams or solo developers.

**bonvoy** uses conventional commits by default (no extra files), but optionally supports changeset files via `@bonvoy/plugin-changeset` for teams that prefer that workflow.

### vs semantic-release

**semantic-release** is fully automatic — every push to main triggers a release. This can be surprising and hard to control.

**bonvoy** gives you control: release when you want with `bonvoy shipit`, or automate it in CI. You decide.

### vs release-it

**release-it** is great for single packages with interactive prompts. But it explicitly won't support monorepos.

**bonvoy** is monorepo-native and non-interactive (CI-friendly), while still supporting single packages.

### vs release-please

**release-please** only supports PR-based workflows and requires complex configuration for monorepos.

**bonvoy** supports both direct and PR workflows, and works with zero config for standard setups.
