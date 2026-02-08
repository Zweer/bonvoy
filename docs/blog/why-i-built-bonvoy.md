# Why I Built Yet Another Release Tool for npm

It was a Tuesday night. I was staring at a CI pipeline that had just published three packages to npm — packages that hadn't changed. Not a single line of code was different, but lerna decided they needed a new version anyway. Again.

I deleted the tags. Unpublished the versions. Pushed a fix. Went to bed angry.

This wasn't the first time. And it wasn't the last.

## The Long Road

I've been trying to solve monorepo releases for years. At work, on personal projects — the problem is always the same: you have multiple packages in one repo, and you need to release them independently, with proper changelogs, proper tags, and proper npm publishes.

It sounds simple. It's not.

### auto + lerna (the first attempt)

At work, about two years ago, I introduced [auto](https://github.com/intuit/auto) by Intuit. It looked perfect: label-based releases, GitHub integration, monorepo support via lerna.

The honeymoon lasted about a week.

Lerna had a bizarre dependency conflict with conventional commits. You had to pin a specific lerna version, otherwise the conventional commits parser wouldn't even load. Update lerna? Conventional commits break. Update conventional commits? Lerna breaks. It was a game you couldn't win.

Then there was the phantom release problem. `auto release` would sometimes [create wrong tags](https://github.com/intuit/auto/issues/596) in lerna monorepos. And lerna itself would [publish packages that hadn't changed](https://github.com/lerna/lerna/issues/1357).

I liked auto enough to contribute — I opened a couple of PRs that got merged. But the lerna dependency was a dead weight. Lerna had been abandoned by its original maintainer, and even after the Nrwl/Nx team adopted it, the fundamental issues remained.

### semantic-release (the popular choice)

Everyone recommends semantic-release. It's the most popular release tool in the npm ecosystem. So I tried it.

One problem: **no monorepo support**. At all. It assumes one repo = one package.

The community has tried to fix this. There's `semantic-release-monorepo`, `multi-semantic-release`, and various forks. But `multi-semantic-release` literally describes itself as a "proof of concept" and warns it "may not be fundamentally stable enough for important production use." Not exactly confidence-inspiring.

### release-it (the interactive one)

[release-it](https://github.com/release-it/release-it) is great for single packages. Interactive prompts, clean workflow, good plugin system.

But monorepo? The maintainer's response in [issue #831](https://github.com/release-it/release-it/issues/831): "There is no built-in support for monorepos in release-it." The issue was closed. Multiple follow-up requests (#858, #516) — same answer.

And it had the same phantom release problem: [empty releases published](https://github.com/release-it/release-it/issues/683) when nothing had changed.

### release-please (the Google one)

Google's [release-please](https://github.com/googleapis/release-please) seemed promising. Conventional commits, monorepo support, PR-based workflow.

Then I tried the GitHub Action.

The original action (`google-github-actions/release-please-action`) was [archived in August 2024](https://github.com/google-github-actions/release-please-action). Migrated to a new org with breaking changes. The v3 to v4 upgrade was described as a ["nasty surprise"](https://danwakeem.medium.com/beware-the-release-please-v4-github-action-ee71ff9de151) by the community. PRs would [randomly stop being created](https://github.com/googleapis/release-please/issues/1946). 197 open issues and counting.

The tool itself is powerful, but the GitHub Action — the thing most people actually use — was a minefield.

### changesets (the last hope)

[changesets](https://github.com/changesets/changesets) is probably the most widely used monorepo release tool. Used by Vercel, Radix, and many others.

I tried it. And I understood why people use it. It's solid.

But it requires you to abandon conventional commits. Instead, you create a `.changeset/something.md` file for every change. Every PR needs a changeset file. Every single one.

For a team that already uses conventional commits — that already writes `feat:` and `fix:` in every commit message — this felt like a step backward. I was adding process, not removing it.

And the PR workflow is mandatory. There's no "just release now" option.

## What I Actually Wanted

After years of trying every tool, I knew exactly what I needed:

1. **Monorepo-native** — not bolted on, not a plugin, not a wrapper. Built for monorepos from day one.
2. **Conventional commits** — I already write them. Use them.
3. **Zero config** — it should work out of the box for the 90% case (npm + GitHub).
4. **Flexible workflow** — sometimes I want to release now. Sometimes I want a PR. Let me choose.
5. **Plugin system** — but a real one, not "write a shell script and hope for the best."
6. **No phantom releases** — if nothing changed, do nothing.

No existing tool checked all six boxes.

## So I Built bonvoy

[bonvoy](https://github.com/Zweer/bonvoy) ("bon voyage to your releases!") is a plugin-based release tool for npm packages and monorepos.

The core is intentionally tiny: a hook system (powered by [tapable](https://github.com/webpack/tapable), the same library webpack uses), workspace detection, and config loading. Everything else is a plugin.

Five default plugins handle the common case:
- **conventional** — parse commits for version bumps
- **changelog** — generate CHANGELOG.md
- **git** — commit, tag, push
- **npm** — publish with OIDC provenance
- **github** — create GitHub releases

### What it looks like

```bash
npm install -D bonvoy
```

```bash
npx bonvoy shipit
```

That's it. bonvoy reads your git history, figures out which packages changed, calculates version bumps from conventional commits, generates changelogs, publishes to npm, and creates GitHub releases.

Want to preview first?

```bash
npx bonvoy shipit --dry-run
```

Force a specific version?

```bash
npx bonvoy shipit 2.0.0
```

Only release one package?

```bash
npx bonvoy shipit --package @scope/core
```

Want a PR workflow instead?

```bash
npx bonvoy prepare
```

### No config needed

For the common case (npm monorepo + GitHub), you don't need a config file. bonvoy detects your workspaces, reads your conventional commits, and does the right thing.

When you need to customize:

```javascript
// bonvoy.config.js
export default {
  versioning: 'independent',
  tagFormat: '{name}@{version}',
  changelog: {
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
    },
  },
};
```

### GitHub Actions

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

## Is It For You?

bonvoy is a good fit if:
- You have a monorepo with npm workspaces
- You use (or want to use) conventional commits
- You want releases to be simple and predictable
- You want to extend behavior with plugins

It's probably **not** for you if:
- You use pnpm or yarn PnP workspaces (npm workspaces only, for now)
- You need a battle-tested enterprise solution (semantic-release has years of production use)
- Your team is already happy with changesets

## Try It

```bash
npm install -D bonvoy
npx bonvoy shipit --dry-run
```

- 📚 [Documentation](https://zweer.github.io/bonvoy)
- 🐙 [GitHub](https://github.com/Zweer/bonvoy)
- 📦 [npm](https://www.npmjs.com/org/bonvoy)

If you've ever been frustrated by monorepo releases, I'd love to hear your story. And if you try bonvoy, let me know what breaks — I'm using it to release itself, so I'm eating my own dog food.

Bon voyage! 🚢
