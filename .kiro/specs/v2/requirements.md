# bonvoy v2 - Roadmap

> Expanding the bonvoy ecosystem with notifications and advanced features.

## 📢 Notifications

### ✅ plugin-slack — COMPLETED

- Slack webhook for release notifications
- Channel, mentions, message format configuration
- Slack Blocks support (rich formatting)

### ✅ plugin-discord — COMPLETED

- Discord webhook
- Embed with changelog and links
- Color and avatar configuration

### ✅ plugin-telegram — COMPLETED

- Telegram Bot API
- Markdown support in messages
- Multiple chat_id configuration

### ✅ plugin-teams — COMPLETED

- Microsoft Teams webhook (Adaptive Cards)
- Teams channel integration

## 🚀 Core Features

### ✅ Pre-release Channels — COMPLETED

- ✅ Support for `next`, `beta`, `canary`, `alpha` channels
- ✅ Automatic publish to npm dist-tag
- Branch → channel configuration

### ✅ Monorepo Dependency Linking — COMPLETED

- ✅ Automatically update versions between internal packages (implemented in shipit)

### ✅ AI Release Notes — COMPLETED

- ✅ Generate release notes summary with LLM
- ✅ Prepend as blockquote above conventional changelog
- ✅ Providers: OpenAI, Anthropic, Gemini (native fetch, zero deps)
- ✅ Custom prompt template support
- ✅ Graceful fallback on API failure

### ✅ LLM-Optimized Documentation — COMPLETED

- ✅ `llms.txt` and `llms-full.txt` generation script
- ✅ Served at `/bonvoy/llms.txt` and `/bonvoy/llms-full.txt`
- ✅ Auto-generated via `predocs:build` hook
- ✅ Build artifacts, gitignored

### ✅ CLI: `bonvoy status --all` — COMPLETED

- ✅ Shows all packages with current versions
- ✅ Changed packages show pending bump
- ✅ Unchanged packages show version only

### ✅ CI: Docs Deploy After Release — COMPLETED

- ✅ `docs.yml` uses `workflow_call` + `workflow_dispatch`
- ✅ `ci.yml` calls docs after release job
- ✅ Checkout with `ref: main` to include release commit

## 📋 Implementation Priority

### ~~Phase 1: Notifications~~ ✅ COMPLETED

1. ~~`plugin-slack`~~ ✅
2. ~~`plugin-discord`~~ ✅
3. ~~`plugin-telegram`~~ ✅
4. ~~`plugin-teams`~~ ✅
5. ~~Pre-release channels~~ ✅ (implemented in v1)

### ~~Phase 2: Core~~ ✅ COMPLETED

6. ~~AI release notes~~ ✅
7. ~~LLM-optimized docs~~ ✅
8. ~~`bonvoy status --all`~~ ✅
9. ~~CI: docs deploy after release~~ ✅

> Integration plugins (sentry, email, jira, linear, s3) and registry/language plugins moved to `.kiro/specs/community-plugins/` — build on community request.

---

_Status: ✅ v2 COMPLETED_
