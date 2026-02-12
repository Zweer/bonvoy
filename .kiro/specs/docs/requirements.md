# bonvoy Documentation Site

> Decision date: 2026-02-08
> Status: ✅ COMPLETED

## Tool: VitePress

VitePress is the natural choice:
- Same ecosystem (Vite, Vitest, tsdown — all Vite-based)
- Used by Vue, Vite, Vitest, Rolldown, Pinia — proven for JS/TS tool docs
- Markdown-first, zero config to start
- Built-in search, dark mode, sidebar, mobile-friendly
- Deploy to GitHub Pages for free

## Structure

```
docs/
├── .vitepress/config.ts       # VitePress config (sidebar, nav, theme)
├── public/logo.svg            # Placeholder logo
├── index.md                   # Landing page (hero + features)
├── getting-started.md         # Install → first release in 2 minutes
├── configuration.md           # All config options with examples
├── cli.md                     # CLI commands reference
├── comparison.md              # Feature matrix vs competitors
├── faq.md                     # Common questions + troubleshooting
│
├── plugins/
│   ├── overview.md            # Plugin system explained (hooks, lifecycle)
│   ├── conventional.md        # @bonvoy/plugin-conventional
│   ├── changelog.md           # @bonvoy/plugin-changelog
│   ├── git.md                 # @bonvoy/plugin-git
│   ├── npm.md                 # @bonvoy/plugin-npm
│   ├── github.md              # @bonvoy/plugin-github
│   ├── gitlab.md              # @bonvoy/plugin-gitlab
│   ├── changeset.md           # @bonvoy/plugin-changeset
│   ├── exec.md                # @bonvoy/plugin-exec
│   └── notifications.md       # slack / discord / telegram / teams
│
├── guides/
│   ├── monorepo.md            # Monorepo setup (npm workspaces)
│   ├── single-package.md      # Single package setup
│   ├── pr-workflow.md         # PR-based release workflow
│   ├── ci-cd.md               # GitHub Actions + GitLab CI
│   ├── migration.md           # From changesets / release-it / semantic-release
│   └── writing-plugins.md     # How to write custom plugins
│
└── reference/
    ├── hooks.md               # All lifecycle hooks with signatures
    └── api.md                 # Programmatic API (@bonvoy/core)
```

## Content Principles

- **Concise**: no fluff, get to the point
- **Copy-pasteable**: every example should work as-is
- **Progressive**: simple first, advanced later
- **Real-world**: use realistic package names and scenarios
- **English**: all docs in English

## Deployment

- GitHub Pages via GitHub Actions
- URL: `zweer.github.io/bonvoy`
- `docs.yml` supports `workflow_call` (called by `ci.yml` after release) + `workflow_dispatch` (manual)
- Checkout uses `ref: main` to include release commit
- `predocs:build` generates `llms.txt` and `llms-full.txt` (LLM-optimized docs)

## Scripts

- `npm run docs:dev` — local dev server
- `npm run docs:build` — production build (includes `predocs:build` for llms.txt)
- `npm run docs:preview` — preview production build

## Completed

- [x] 22 documentation pages written
- [x] VitePress config with sidebar, nav, search
- [x] GitHub Actions workflow for Pages deployment
- [x] Placeholder ship logo SVG
- [x] FIRST_RELEASE.md removed (content in getting-started.md)
- [x] README.md slimmed down with links to docs
- [x] Base path `/bonvoy/` for GitHub Pages sub-path
- [x] Blog section added (`docs/blog/`)
- [x] Install commands updated: `npm install -D bonvoy` (unscoped package)
- [x] `@bonvoy/cli` renamed to `bonvoy`, root renamed to `bonvoy-monorepo`
- [x] `llms.txt` and `llms-full.txt` generation (`scripts/generate-llms-txt.ts`)
- [x] LLM docs served at `/bonvoy/llms.txt` and `/bonvoy/llms-full.txt`
- [x] Docs deploy after release via `workflow_call` in CI

## Blog Section

Articles live on the docs site at `/blog/` for SEO benefits:
- Google indexes under our domain → authority for the whole site
- Canonical URL is ours — dev.to/Medium are cross-posts
- Internal links between articles and docs → mutual SEO boost
- No fancy blog engine — just markdown pages in `docs/blog/`

## Open Questions

- [ ] Domain: `bonvoy.dev`? Check availability
- [ ] Logo: design or keep placeholder?
- [ ] Video: terminal recording tool? (asciinema? vhs?)
