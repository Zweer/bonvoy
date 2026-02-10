# @bonvoy/plugin-ai

AI-generated release notes summary for bonvoy changelogs. Prepends a human-readable summary above the conventional changelog.

## Installation

```bash
npm install @bonvoy/plugin-ai
```

## Usage

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-ai', { provider: 'openai' }]
  ]
};
```

Set the API key as an environment variable:

```bash
OPENAI_API_KEY=sk-...
```

## Output

The plugin adds a blockquote summary after the version header:

```markdown
## [0.9.0] - 2026-02-10

> Adds automatic rollback for failed releases and improves error messages.
> If a publish fails mid-way, bonvoy now undoes all completed steps automatically.

### ✨ Features
- add rollback & recovery for failed releases

### 🐛 Bug Fixes
- improve error messages for rollback status
```

The conventional changelog below remains unchanged.

## Providers

Three providers are supported, each using native `fetch` with zero extra dependencies.

| Provider | Default Model | Env Var |
|----------|---------------|---------|
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `anthropic` | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| `gemini` | `gemini-2.0-flash` | `GEMINI_API_KEY` |

```javascript
// Anthropic
['@bonvoy/plugin-ai', { provider: 'anthropic' }]

// Gemini
['@bonvoy/plugin-ai', { provider: 'gemini' }]

// Custom model
['@bonvoy/plugin-ai', { provider: 'openai', model: 'gpt-4o' }]
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `provider` | `'openai' \| 'anthropic' \| 'gemini'` | Yes | LLM provider |
| `model` | `string` | No | Model name (uses provider default) |
| `apiKey` | `string` | No | API key (defaults to env var) |
| `promptTemplate` | `string` | No | Custom prompt with `{packageName}`, `{version}`, `{commitList}` placeholders |
| `maxTokens` | `number` | No | Max response tokens (default: `200`) |

## Behavior

- Runs after the conventional changelog is generated (`afterChangelog` hook)
- One LLM call per changed package
- Skipped in `--dry-run` mode (no API cost)
- On API failure: logs a warning, keeps the conventional changelog as-is

## License

MIT
