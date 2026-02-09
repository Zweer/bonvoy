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

### plugin-email (Priority: Low)
- Notifications via SMTP or Amazon SES
- Customizable HTML templates
- Configurable recipient list

## 🔧 Integrations

### plugin-sentry (Priority: Medium)
- Create releases on Sentry
- Associate commits with release
- Sourcemap upload

### plugin-jira (Priority: Low)
- Update Jira tickets mentioned in commits
- Automatic status transition
- Comment with release link

### plugin-linear (Priority: Low)
- Update Linear issues
- Automatic issue closing

### plugin-s3 (Priority: Low)
- Upload assets to S3
- Bucket and path configuration
- CloudFront invalidation support

## 🚀 Core Features

### ✅ Pre-release Channels — COMPLETED
- ✅ Support for `next`, `beta`, `canary`, `alpha` channels
- ✅ Automatic publish to npm dist-tag
- Branch → channel configuration

### Monorepo Dependency Linking
- ✅ Automatically update versions between internal packages (implemented in shipit)
- `workspace:*` → real version support
- Option to bump dependents

### AI Release Notes (Experimental)
- Generate release notes with LLM
- Intelligent change summary
- Provider configuration (OpenAI, Anthropic, Bedrock)

## 📋 Implementation Priority

### ~~Phase 1: Notifications~~ ✅ COMPLETED
1. ~~`plugin-slack`~~ ✅
2. ~~`plugin-discord`~~ ✅
3. ~~`plugin-telegram`~~ ✅
4. ~~`plugin-teams`~~ ✅
5. ~~Pre-release channels~~ ✅ (implemented in v1)

### Phase 2: Integrations (on demand)
6. `plugin-sentry`
7. `plugin-email`

### Phase 3: Core (on demand)
8. `workspace:*` support
9. AI release notes

> Registry/language plugins (jsr, docker, pypi, cargo, etc.) moved to `.kiro/specs/community-plugins/` — build on community request.

---

*Status: Notifications complete, remaining features on demand*
