# I Migrated from Changesets to bonvoy — Here's What Changed

I used [changesets](https://github.com/changesets/changesets) for over a year. It's a solid tool. Vercel uses it. Radix uses it. It works.

But every time I opened a PR, I had the same thought: "I already wrote `feat: add dark mode` in my commit message. Why do I also need to create a `.changeset/fuzzy-dogs-dance.md` file saying the same thing?"

So I migrated. Here's what happened.

## What I Liked About Changesets

Let me be fair. Changesets does several things well:

- **Explicit intent** — you decide what the bump is, not an algorithm
- **PR review** — reviewers can see the version bump in the diff
- **Batching** — the release PR collects all changes before publishing
- **Mature** — years of production use, battle-tested

If your team doesn't use conventional commits and wants explicit control over every version bump, changesets is genuinely good. Keep using it.

## Where It Fell Short

### 1. Double bookkeeping

Every PR needs two things: a conventional commit message AND a changeset file. The commit message is for the git log. The changeset file is for the release. They say the same thing in different formats.

```bash
# The commit
git commit -m "feat: add dark mode support"

# The changeset (same information, different format)
npx changeset
# → select packages
# → select bump type
# → write description
# → creates .changeset/fuzzy-dogs-dance.md
```

With bonvoy, the commit message IS the changeset.

### 2. Mandatory PR workflow

Changesets requires a release PR. The bot creates it, you merge it, packages get published. There's no "just release now" option.

Sometimes I'm working alone on a Saturday and I want to ship a fix. I don't want to create a PR, wait for CI, merge it, wait for CI again, then publish. I want:

```bash
npx bonvoy shipit
```

### 3. Unpredictable bumps

With changesets, the version bump depends on which changeset files exist. If someone forgets to add one, the package doesn't get released. If someone adds the wrong bump type, you get a wrong version.

With conventional commits, the bump is determined by the commit type. `feat:` = minor. `fix:` = patch. `BREAKING CHANGE` = major. It's mechanical and predictable.

### 4. The changeset bot noise

Every PR without a changeset file gets a bot comment: "⚠️ No Changeset found." On PRs that don't need releases (docs, CI, refactoring), this is just noise.

## The Migration

It took about 5 minutes.

### Step 1: Install bonvoy, remove changesets

```bash
npm install -D bonvoy
npm uninstall @changesets/cli @changesets/changelog-github
```

### Step 2: Delete changeset config

```bash
rm -rf .changeset
```

### Step 3: Update CI

Before (changesets):

```yaml
- run: npx changeset version
- run: npx changeset publish
```

After (bonvoy):

```yaml
- run: npx bonvoy shipit
```

### Step 4: Tag current versions

bonvoy needs git tags to know where the last release was:

```bash
# For each package at its current version
git tag @my-org/core@2.3.1
git tag @my-org/utils@1.5.0
git push --tags
```

That's it. Next time you run `bonvoy shipit`, it picks up all conventional commits since those tags.

## Side by Side

| | Changesets | bonvoy |
|---|---|---|
| **Track changes** | `.changeset/*.md` files | Conventional commits |
| **Decide bump** | Manual (in changeset file) | Automatic (from commit type) |
| **Release trigger** | Merge release PR | `bonvoy shipit` (or PR workflow) |
| **PR requirement** | Always | Optional |
| **Config files** | `.changeset/config.json` | None (zero-config) |
| **Bot comments** | Yes (on every PR) | No |
| **Monorepo** | ✅ | ✅ |
| **Changelog** | ✅ | ✅ |

## What I Gained

- **No more changeset files** — one less thing to remember per PR
- **Flexible workflow** — direct release when I want, PR workflow when I need it
- **Predictable bumps** — commit type determines version, always
- **Less CI noise** — no bot comments on every PR
- **Simpler CI config** — one command instead of version + publish

## What I Lost

- **Explicit bump review** — reviewers can't see the version bump in the PR diff (but they can see the commit type)
- **Batching control** — changesets lets you hold changes and release them together (bonvoy releases everything since the last tag)
- **Ecosystem maturity** — changesets has years of production use and edge cases handled

## Should You Migrate?

**Yes, if:**
- Your team already uses conventional commits
- You're tired of creating changeset files
- You want the option to release without a PR
- You value simplicity over explicit control

**No, if:**
- Your team doesn't use conventional commits (and doesn't want to)
- You need reviewers to approve version bumps explicitly
- You're happy with your current workflow
- You need pnpm/yarn PnP workspace support (bonvoy is npm workspaces only, for now)

## Try It

```bash
npm install -D bonvoy
npx bonvoy shipit --dry-run
```

- 📚 [Migration guide](https://zweer.github.io/bonvoy/guides/migration)
- 📚 [Full documentation](https://zweer.github.io/bonvoy)
- 🐙 [GitHub](https://github.com/Zweer/bonvoy)
