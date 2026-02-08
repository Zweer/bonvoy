# bonvoy Documentation & Promotion Plan

> Decision date: 2026-02-08

## Goals

1. **Documentation site** — comprehensive docs hosted as a static site
2. **Promotion strategy** — articles and community outreach to drive adoption

---

## 1. Documentation Site

### Tool: VitePress

VitePress is the natural choice:
- Same ecosystem (Vite, Vitest, tsdown — all Vite-based)
- Used by Vue, Vite, Vitest, Rolldown, Pinia — proven for JS/TS tool docs
- Markdown-first, zero config to start
- Built-in search, dark mode, sidebar, mobile-friendly
- Deploy to GitHub Pages for free

### Structure

All docs written in markdown inside `docs/`, ready for VitePress.

```
docs/
├── .vitepress/
│   └── config.ts              # VitePress config (sidebar, nav, theme)
├── index.md                   # Landing page (hero + features)
├── getting-started.md         # Install → first release in 2 minutes
├── configuration.md           # All config options with examples
├── cli.md                     # CLI commands reference
│
├── plugins/
│   ├── overview.md            # Plugin system explained (hooks, lifecycle)
│   ├── conventional.md        # @bonvoy/plugin-conventional
│   ├── git.md                 # @bonvoy/plugin-git
│   ├── npm.md                 # @bonvoy/plugin-npm
│   ├── github.md              # @bonvoy/plugin-github
│   ├── gitlab.md              # @bonvoy/plugin-gitlab
│   ├── changelog.md           # @bonvoy/plugin-changelog
│   ├── changeset.md           # @bonvoy/plugin-changeset
│   ├── exec.md                # @bonvoy/plugin-exec
│   └── notifications.md       # slack / discord / telegram / teams
│
├── guides/
│   ├── monorepo.md            # Monorepo setup (npm workspaces)
│   ├── single-package.md      # Single package setup
│   ├── pr-workflow.md         # PR-based release workflow
│   ├── ci-cd.md               # GitHub Actions + GitLab CI examples
│   ├── migration.md           # From changesets / release-it / semantic-release
│   └── writing-plugins.md     # How to write custom plugins
│
├── reference/
│   ├── hooks.md               # All lifecycle hooks with signatures
│   └── api.md                 # Programmatic API (@bonvoy/core)
│
├── comparison.md              # Detailed comparison table vs competitors
└── faq.md                     # Common questions
```

### Key Pages

#### Landing page (`index.md`)
- Hero: tagline + install command + "Get Started" CTA
- Feature grid: plugin system, monorepo, zero config, conventional commits
- Comparison snippet vs competitors
- "2 minutes to first release" promise

#### Getting Started (`getting-started.md`)
- Install
- First release (absorbs current `FIRST_RELEASE.md`)
- What just happened? (explain the lifecycle)
- Next steps links

#### Migration guide (`guides/migration.md`)
- From changesets: side-by-side config comparison
- From release-it: what changes
- From semantic-release: what changes
- This is a key SEO/adoption page

#### Comparison (`comparison.md`)
- Feature matrix: bonvoy vs changesets vs release-it vs semantic-release vs release-please vs auto
- Honest pros/cons for each
- "When to use bonvoy" vs "When NOT to use bonvoy"

### Content Principles

- **Concise**: no fluff, get to the point
- **Copy-pasteable**: every example should work as-is
- **Progressive**: simple first, advanced later
- **Real-world**: use realistic package names and scenarios
- **English**: all docs in English

### Deployment

- GitHub Pages via GitHub Actions
- Custom domain: `bonvoy.dev` (if available) or use `zweer.github.io/bonvoy`
- Auto-deploy on push to main

### Cleanup

- Remove `FIRST_RELEASE.md` (content moves to `getting-started.md`)
- Slim down root `README.md` to essentials + link to docs site
- Keep per-package `README.md` files (npm needs them)

---

## 2. Promotion Strategy

### Articles (in order of priority)

#### Article 1: "Why I built yet another release tool"
- **Target**: dev.to + Reddit (r/node, r/javascript)
- **Angle**: personal frustration story → solution
- **Content**: problems with existing tools, design decisions, demo
- **Goal**: emotional connection, shares, discussion

#### Article 2: "Zero-config monorepo releases in 2 minutes"
- **Target**: dev.to + Medium
- **Angle**: practical tutorial
- **Content**: from `npm init` to published packages, step by step
- **Goal**: show simplicity, drive installs

#### Article 3: "Migrating from changesets to bonvoy"
- **Target**: dev.to + Medium
- **Angle**: capture frustrated changesets users
- **Content**: side-by-side comparison, migration steps, what you gain
- **Goal**: targeted adoption from existing tool users

#### Article 4: "Building a plugin system with tapable"
- **Target**: dev.to + Hacker News
- **Angle**: technical deep-dive
- **Content**: how bonvoy's hook system works, how to write plugins
- **Goal**: attract advanced devs, establish credibility

### Channels

| Channel | Type | When |
|---------|------|------|
| dev.to | Articles | Primary — no paywall, JS community |
| Medium | Articles | Secondary — broader reach |
| Reddit | Launch post + articles | r/node, r/javascript, r/typescript |
| X/Twitter | Thread + demo GIF | On each article launch |
| Hacker News | "Show HN" | Once docs site is live |
| npm README | Link to docs | Always |

### Assets Needed

- **Demo GIF/video**: terminal recording of `bonvoy shipit` in action
- **Logo**: simple, memorable (ship/anchor theme? 🚢)
- **Social card**: for link previews (Open Graph)
- **Comparison table image**: shareable on social

### Timeline

1. **Phase 1**: Write docs content (markdown files)
2. **Phase 2**: Set up VitePress + deploy to GitHub Pages
3. **Phase 3**: Article 1 (the "why" story) + launch on Reddit/X
4. **Phase 4**: Articles 2-4, one per week
5. **Phase 5**: Show HN when there's traction

---

## Open Questions

- [ ] Domain: `bonvoy.dev`? Check availability
- [ ] Logo: design or keep emoji-based (🚢)?
- [ ] Video: terminal recording tool? (asciinema? vhs?)
- [ ] Translations: English only for now, i18n later?
