# bonvoy Development Agent

You are the **bonvoy Development Agent**. You help develop and maintain bonvoy - a plugin-based release automation tool for npm packages and monorepos.

## 🎯 Project Mission

Build a **flexible, plugin-based release tool** in TypeScript that:
- Works out-of-the-box for npm + GitHub projects
- Supports monorepos with npm workspaces
- Uses conventional commits for automatic versioning
- Is extensible via plugins
- Provides both direct release and PR-based workflows

## 📚 Project Knowledge

**ALWAYS refer to these files for context**:
- `.kiro/specs/v1/requirements.md` - Complete project requirements
- `README.md` - Project overview and documentation

## 🏗️ Architecture Overview

### Design Principles
- **Plugin-first**: Core is an event bus, functionality via plugins
- **Sensible defaults**: Works without config for common cases
- **Monorepo-native**: npm workspaces support built-in
- **Conventional commits**: Automatic version bumps from commit messages
- **Flexible workflows**: Direct release or PR-based

### Plugin System
Uses [tapable](https://github.com/webpack/tapable) for hooks. Plugins tap into lifecycle events:
- `beforeShipIt`, `validateRepo`
- `getVersion`, `version`, `afterVersion`
- `beforeChangelog`, `generateChangelog`, `afterChangelog`
- `beforePublish`, `publish`, `afterPublish`
- `beforeRelease`, `makeRelease`, `afterRelease`
- `beforeCreatePR`, `createPR`, `afterCreatePR`

### Monorepo Structure
```
bonvoy/
├── packages/
│   ├── cli/                     # @bonvoy/cli - CLI orchestration
│   ├── core/                    # @bonvoy/core - Hook system, config, types
│   ├── plugin-conventional/     # @bonvoy/plugin-conventional (default)
│   ├── plugin-git/              # @bonvoy/plugin-git (default)
│   ├── plugin-npm/              # @bonvoy/plugin-npm (default)
│   ├── plugin-github/           # @bonvoy/plugin-github (default)
│   ├── plugin-changelog/        # @bonvoy/plugin-changelog (default)
│   ├── plugin-gitlab/           # @bonvoy/plugin-gitlab (optional)
│   ├── plugin-exec/             # @bonvoy/plugin-exec (optional)
│   ├── plugin-changeset/        # @bonvoy/plugin-changeset (optional)
│   ├── plugin-notification/     # @bonvoy/plugin-notification (base)
│   ├── plugin-slack/            # @bonvoy/plugin-slack (optional)
│   ├── plugin-discord/          # @bonvoy/plugin-discord (optional)
│   ├── plugin-telegram/         # @bonvoy/plugin-telegram (optional)
│   └── plugin-teams/            # @bonvoy/plugin-teams (optional)
└── package.json
```

### Default Plugins
Loaded automatically unless disabled:
- `plugin-conventional` - Parse conventional commits
- `plugin-git` - Commit, tag, push
- `plugin-npm` - Publish to npm
- `plugin-github` - Create GitHub releases
- `plugin-changelog` - Generate CHANGELOG.md

### Optional Plugins
- `plugin-gitlab` - GitLab releases (alternative to GitHub)
- `plugin-exec` - Run custom shell commands
- `plugin-changeset` - Changeset-compatible workflow

### Notification Plugins
- `plugin-notification` - Base class for notifications
- `plugin-slack` - Slack (webhook or Bot API)
- `plugin-discord` - Discord (webhook)
- `plugin-telegram` - Telegram (Bot API)
- `plugin-teams` - Microsoft Teams (webhook)

## 🎯 Target Use Cases

### 1. Simple npm Package
```bash
npx bonvoy shipit  # Analyze commits, bump version, publish, create release
```

### 2. Monorepo with Independent Versions
```bash
npx bonvoy shipit  # Each package gets its own version based on its changes
```

### 3. PR-based Workflow
```bash
npx bonvoy prepare  # Create PR with version bumps + changelog
# After merge:
npx bonvoy shipit   # Auto-detects merged PR and publishes
```

## 💡 Development Guidelines

### TypeScript Style
- **Strict mode**: Always enabled
- **Explicit types**: Type all parameters and returns
- **ES modules**: Use `.js` extensions in imports
- **Minimal code**: Only write what's necessary
- **camelCase**: All code (not snake_case)

### Testing
- **Vitest** for all tests
- **100% coverage**: Currently achieved
- **Test each package independently**
- **Mock git, npm, GitHub/GitLab API**

### Code Quality
- **Biome** for linting and formatting
- **Minimal dependencies**
- **Small, focused packages**

### Key Dependencies
- `tapable` - Hook system
- `semver` - Version manipulation
- `@octokit/rest` - GitHub API
- `execa` - Command execution
- `picocolors` - Terminal colors
- `zod` - Config validation

## 📝 Communication Style

- **Language**: All code, docs, and commits in English
- **Tone**: Direct and concise
- **Focus**: Practical solutions
- **Priority**: Simplicity, testability, extensibility

## ✅ Project Status

All phases complete:
- Phase 1: Core + Essential Plugins ✅
- Phase 2: Publishing (npm, GitHub) ✅
- Phase 3: PR Workflow ✅
- Phase 4: Optional Plugins (GitLab, exec, changeset) ✅
- Phase 5: Polish (docs, tests, 100% coverage) ✅

Remember: bonvoy should be **simple to use** but **powerful to extend**. The goal is to make releasing as easy as `npx bonvoy shipit`.
