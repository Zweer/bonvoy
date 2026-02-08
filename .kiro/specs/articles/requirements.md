# bonvoy Articles Plan

> Decision date: 2026-02-08

## Editorial Line

### Voice & Tone
- **First person** — "I built", "I was frustrated", "here's what I did"
- **Honest** — admit limits, don't oversell. "bonvoy isn't for everyone"
- **Practical** — every article has copy-paste working code
- **Concise** — no 5-paragraph intros. Get to the point

### Publishing
- **Cadence**: 1 article per week for 4 weeks
- **Day**: Tuesday or Wednesday morning (peak engagement on dev.to)
- **Cross-post**: X/Twitter thread the day after each article
- **Language**: English
- **Canonical URL**: docs site (`/blog/`), then cross-post to dev.to/Medium

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

### Key Narrative Strengths
- Not a caprice — years of attempts, not "tried one tool and gave up"
- Contributed code — PRs on auto, tried to fix things before leaving
- Both work and personal — real need, not a toy project
- Exhausted ALL options before building bonvoy

---

## Article 1: "Why I built yet another release tool for npm"

- **Goal**: emotional connection, make readers say "I have this problem too!"
- **Structure**: frustration → research → decision → solution → demo
- **Hook**: open with a specific frustration moment
- **Closes with**: link to docs + `npm install`
- **Target**: dev.to + Reddit r/javascript
- **SEO**: "npm release tool", "monorepo release", "changesets alternative"

### Outline
1. The moment (personal story, specific frustration)
2. The journey (table of tools tried + why each failed, with issue links)
3. What I actually wanted (design principles)
4. What I built (bonvoy intro + quick demo)
5. Try it (link to docs, install command)

---

## Article 2: "Zero-config monorepo releases in 2 minutes"

- **Goal**: show simplicity, drive installs
- **Structure**: pure step-by-step tutorial
- **Hook**: "What if releasing your monorepo was as simple as one command?"
- **Includes**: terminal recording / screenshots
- **Target**: dev.to + Medium
- **SEO**: "monorepo release tutorial", "npm workspaces release"

### Outline
1. What we're building (2 sentences)
2. Setup (npm init, workspaces, install bonvoy)
3. Write some code + conventional commits
4. `bonvoy shipit --dry-run` (show output)
5. `bonvoy shipit` (show result)
6. Verify (npm, GitHub releases, tags)
7. Add CI (GitHub Actions snippet)

---

## Article 3: "I migrated from changesets to bonvoy — here's what changed"

- **Goal**: capture frustrated changesets users
- **Structure**: before/after side-by-side
- **Hook**: "I loved changesets. Until I didn't."
- **SEO**: "changesets alternative", "changesets problems", "migrate from changesets"
- **Target**: dev.to + Medium

### Outline
1. Why I used changesets (what's good about it)
2. Where it fell short (specific pain points)
3. Side-by-side: changesets workflow vs bonvoy workflow
4. Migration steps (5 minutes)
5. What I gained / what I lost (honest)
6. Should you migrate? (decision framework)

---

## Article 4: "How I built a plugin system with tapable (and you can too)"

- **Goal**: technical credibility, attract advanced devs
- **Structure**: architectural deep-dive
- **Hook**: "webpack's secret weapon isn't webpack — it's tapable"
- **Target**: dev.to + Hacker News
- **SEO**: "tapable tutorial", "plugin system javascript"

### Outline
1. What is tapable (1 paragraph)
2. Why I chose it over EventEmitter
3. bonvoy's hook system (code walkthrough)
4. Writing a plugin (step-by-step)
5. Sync vs async vs waterfall hooks
6. Testing plugins
7. The pattern: how to add a plugin system to any tool

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

## Status

- [ ] Article 1: not started
- [ ] Article 2: not started
- [ ] Article 3: not started
- [ ] Article 4: not started
