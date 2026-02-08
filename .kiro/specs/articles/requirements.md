# bonvoy Articles Plan

> Decision date: 2026-02-08

## Editorial Line

### Voice & Tone
- **First person** — "I built", "I was frustrated", "here's what I did"
- **Honest** — admit limits, don't oversell. "bonvoy isn't for everyone"
- **Practical** — every article has copy-paste working code
- **Concise** — no 5-paragraph intros. Get to the point

### Publishing
- **Cadence**: 1 article per week
- **Day**: Tuesday or Wednesday morning (peak engagement on dev.to)
- **Cross-post**: X/Twitter thread the day after each article
- **Language**: English
- **Canonical URL**: docs site (`/blog/`), then cross-post to dev.to/Medium
- **Drafts**: `drafts/` folder at repo root, move to `docs/blog/` + add to sidebar when publishing

---

## The Story (for Article 1)

### Author's Journey (real, verified)

Years of frustration releasing packages in monorepos, both at work and personal projects:

1. **auto + lerna** (at work, ~2 years ago)
   - Lerna had dependency hell with conventional commits ([lerna#1934](https://github.com/lerna/lerna/issues/1934))
   - Had to pin lerna versions to keep conventional commits working
   - auto released wrong versions ([auto#596](https://github.com/intuit/auto/issues/596))
   - Lerna published even when nothing changed ([lerna#912](https://github.com/lerna/lerna/issues/912), [lerna#1357](https://github.com/lerna/lerna/issues/1357))
   - auto required lerna for monorepo ([auto#1861](https://github.com/intuit/auto/discussions/1861))
   - Lerna was abandoned, then adopted by Nrwl/Nx team (not "became Nx")
   - Author contributed PRs to auto — tried to make it work before giving up

2. **semantic-release**
   - No native monorepo support
   - Community plugins are workarounds: `semantic-release-monorepo`, `multi-semantic-release` (self-described as "proof of concept", warns "may not be fundamentally stable enough for production")
   - Multiple forks, none official

3. **release-it**
   - No monorepo support: "There is no built-in support for monorepos" ([release-it#831](https://github.com/release-it/release-it/issues/831))
   - Empty releases published ([release-it#683](https://github.com/release-it/release-it/issues/683))
   - ⚠️ Not labeled "wontfix" but maintainer closed issues without implementing

4. **release-please**
   - Original GitHub Action (`google-github-actions/release-please-action`) archived Aug 15, 2024
   - Migrated to `googleapis/release-please-action` with breaking changes
   - v3→v4 migration described as "nasty surprise" ([Medium article](https://danwakeem.medium.com/beware-the-release-please-v4-github-action-ee71ff9de151))
   - 197 open issues, PRs stop working ([release-please#1946](https://github.com/googleapis/release-please/issues/1946))
   - ⚠️ Not "abandoned by Google" — moved orgs, still maintained, but transition was chaotic

5. **changesets**
   - Must abandon conventional commits (uses its own change file format)
   - Must create a file for every change — too much friction
   - PR workflow mandatory

6. → **"ok, I'll build my own"**

---

## Articles

### Article 1: "Why I built yet another release tool for npm" ✅ LIVE
- **Location**: `docs/blog/why-i-built-bonvoy.md`
- **Goal**: emotional connection, make readers say "I have this problem too!"
- **Target**: dev.to + Reddit r/javascript

### Article 2: "Zero-config monorepo releases in 2 minutes" 📝 DRAFT
- **Location**: `drafts/zero-config-monorepo-releases.md`
- **Goal**: show simplicity, drive installs
- **Target**: dev.to + Medium

### Article 3: "I migrated from changesets to bonvoy" 📝 DRAFT
- **Location**: `drafts/migrating-from-changesets.md`
- **Goal**: capture frustrated changesets users
- **Target**: dev.to + Medium

### Article 4: "Plugin system with tapable" 📝 DRAFT
- **Location**: `drafts/plugin-system-with-tapable.md`
- **Goal**: technical credibility, attract advanced devs
- **Target**: dev.to + Hacker News

### Article 5: "Migrating from semantic-release" 📝 DRAFT
- **Location**: `drafts/migrating-from-semantic-release.md`
- **Goal**: capture the largest user base
- **Target**: dev.to + Medium

### Article 6: "Migrating from release-it" 📝 DRAFT
- **Location**: `drafts/migrating-from-release-it.md`
- **Goal**: capture single-package users moving to monorepo
- **Target**: dev.to + Medium

### Article 7: "Migrating from release-please" 📝 DRAFT
- **Location**: `drafts/migrating-from-release-please.md`
- **Goal**: capture users frustrated by GitHub Action chaos
- **Target**: dev.to + Medium

### Article 8: "Migrating from auto + lerna" 📝 DRAFT
- **Location**: `drafts/migrating-from-auto-lerna.md`
- **Goal**: capture users stuck with lerna dependency issues
- **Target**: dev.to + Medium

---

## Promotion Channels

| Channel | Type | When |
|---------|------|------|
| dev.to | Articles | Primary — no paywall, JS community |
| Medium | Articles | Secondary — broader reach |
| Reddit | Launch post + articles | r/node, r/javascript, r/typescript |
| X/Twitter | Thread + demo GIF | Day after each article |
| Hacker News | "Show HN" | After article 4 (technical) |

## Assets Needed

- [ ] Demo GIF/video: terminal recording of `bonvoy shipit`
- [ ] Social card: Open Graph image for link previews
- [ ] Comparison table image: shareable on social

## Publishing Workflow

To publish a draft:
1. `mv drafts/<article>.md docs/blog/`
2. Add entry to sidebar in `docs/.vitepress/config.ts`
3. Commit and push
4. Cross-post to dev.to/Medium with canonical URL pointing to docs site
