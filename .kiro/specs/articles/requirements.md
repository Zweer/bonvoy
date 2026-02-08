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

---

## Article 1: "Why I built yet another release tool for npm"

- **Goal**: emotional connection, make readers say "I have this problem too!"
- **Structure**: frustration → research → decision → solution → demo
- **Hook**: open with a specific frustration moment (e.g., "It was 11pm and changesets had just bumped my package to a version I didn't expect. Again.")
- **Closes with**: link to docs + `npm install`
- **Target**: dev.to + Reddit r/javascript
- **SEO**: "npm release tool", "monorepo release", "changesets alternative"

### Outline
1. The problem (2-3 paragraphs, personal story)
2. What I tried (table of tools + why each didn't work)
3. What I wanted (design principles list)
4. What I built (bonvoy intro + architecture diagram)
5. Demo (terminal recording or code blocks)
6. What's next (link to docs, invite to contribute)

---

## Article 2: "Zero-config monorepo releases in 2 minutes"

- **Goal**: show simplicity, drive installs
- **Structure**: pure step-by-step tutorial, from `npm init` to published release
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
- **Structure**: before/after side-by-side, config comparison, DX comparison
- **Hook**: "I loved changesets. Until I didn't."
- **SEO**: "changesets alternative", "changesets problems", "migrate from changesets"
- **Target**: dev.to + Medium

### Outline
1. Why I used changesets (what's good about it)
2. Where it fell short (specific pain points)
3. Side-by-side: changesets workflow vs bonvoy workflow
4. Migration steps (5 minutes)
5. What I gained (no change files, flexible workflow, etc.)
6. What I lost (honest: change files as documentation)
7. Should you migrate? (decision framework)

---

## Article 4: "How I built a plugin system with tapable (and you can too)"

- **Goal**: technical credibility, attract advanced devs
- **Structure**: architectural deep-dive, how hooks work, how to write a plugin
- **Hook**: "webpack's secret weapon isn't webpack — it's tapable"
- **Target**: dev.to + Hacker News
- **SEO**: "tapable tutorial", "plugin system javascript", "webpack hooks"

### Outline
1. What is tapable (1 paragraph)
2. Why I chose it over EventEmitter (comparison)
3. bonvoy's hook system (code walkthrough)
4. Writing a plugin (step-by-step)
5. Sync vs async hooks (with examples)
6. Waterfall hooks (modifyConfig, getVersion)
7. Testing plugins (vitest example)
8. The pattern: how to add a plugin system to any tool

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

## Publishing Strategy

Articles are published on the docs site (`/blog/`) as canonical source.
Then cross-posted to dev.to and Medium with canonical URL pointing back.

## Status

- [ ] Article 1: not started
- [ ] Article 2: not started
- [ ] Article 3: not started
- [ ] Article 4: not started
