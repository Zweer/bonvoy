# bonvoy v2 - Roadmap

> Expanding the bonvoy ecosystem with notifications, new registries, and advanced features.

## 📢 Notifications

Plugins to notify the team after a release.

### plugin-slack (Priority: High)
- Slack webhook for release notifications
- Channel, mentions, message format configuration
- Slack Blocks support (rich formatting)

### plugin-discord (Priority: High)
- Discord webhook
- Embed with changelog and links
- Color and avatar configuration

### plugin-telegram (Priority: Medium)
- Telegram Bot API
- Markdown support in messages
- Multiple chat_id configuration

### plugin-teams (Priority: Medium)
- Microsoft Teams webhook (Adaptive Cards)
- Teams channel integration

### plugin-email (Priority: Low)
- Notifications via SMTP or Amazon SES
- Customizable HTML templates
- Configurable recipient list

## 📦 Other Registries

Support for publishing to registries beyond npm.

### plugin-jsr (Priority: High)
- Publish to [JSR](https://jsr.io) (JavaScript Registry)
- Native TypeScript support
- Compatible with Deno and Bun
- `jsr.json` management

### plugin-docker (Priority: High)
- Build and push Docker images
- Automatic version-based tags
- Multi-registry support (Docker Hub, GHCR, ECR)
- Dockerfile path configuration

### plugin-pypi (Priority: Medium)
- Publish to PyPI (Python Package Index)
- `pyproject.toml` and `setup.py` support
- OIDC authentication (Trusted Publishers)

### plugin-cargo (Priority: Medium)
- Publish to crates.io (Rust)
- `Cargo.toml` management
- Cargo workspace support

### plugin-maven (Priority: Low)
- Publish to Maven Central (Java)
- `pom.xml` management
- GPG signing

### plugin-nuget (Priority: Low)
- Publish to NuGet (.NET)
- `.csproj` and `.nuspec` management

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

### Pre-release Channels
- Support for `next`, `beta`, `canary`, `alpha` channels
- Automatic publish to npm dist-tag
- Branch → channel configuration

### Monorepo Dependency Linking
- Automatically update versions between internal packages
- `workspace:*` → real version support
- Option to bump dependents

### AI Release Notes (Experimental)
- Generate release notes with LLM
- Intelligent change summary
- Provider configuration (OpenAI, Anthropic, Bedrock)

## 📋 Implementation Priority

### Phase 1: Basic Notifications
1. `plugin-slack`
2. `plugin-discord`

### Phase 2: New Registries
3. `plugin-jsr`
4. `plugin-docker`

### Phase 3: Advanced Notifications
5. `plugin-telegram`
6. `plugin-teams`

### Phase 4: Other Languages
7. `plugin-pypi`
8. `plugin-cargo`

### Phase 5: Integrations
9. `plugin-sentry`
10. Pre-release channels

---

*Status: Planning*
*Target: bonvoy v2.0.0*
