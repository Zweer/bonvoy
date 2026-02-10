# AI Release Notes

Prepend an AI-generated summary to your conventional changelog. The summary appears as a blockquote above the commit list, giving readers a quick overview of what changed.

## Installation

```bash
npm install -D @bonvoy/plugin-ai
```

## Usage

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-ai', { provider: 'openai' }]
  ],
};
```

Set the API key:

```bash
export OPENAI_API_KEY=sk-...
```

## Output Example

```markdown
## [0.9.0] - 2026-02-10

> Adds automatic rollback for failed releases and improves error
> messages. If a publish fails mid-way, bonvoy now undoes all
> completed steps automatically.

### ✨ Features
- add rollback & recovery for failed releases

### 🐛 Bug Fixes
- improve error messages for rollback status
```

## Providers

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
| `promptTemplate` | `string` | No | Custom prompt template |
| `maxTokens` | `number` | No | Max response tokens (default: `200`) |

## Custom Prompt

Override the default prompt with `{packageName}`, `{version}`, and `{commitList}` placeholders:

```javascript
['@bonvoy/plugin-ai', {
  provider: 'openai',
  promptTemplate: `Summarize the changes for {packageName} v{version} in 2 sentences.
Focus on user-facing changes.

Commits:
{commitList}`,
}]
```

## Behavior

- Runs after the conventional changelog is generated (`afterChangelog` hook)
- One LLM call per changed package
- Skipped in `--dry-run` mode (no API cost)
- On API failure: logs a warning, keeps the conventional changelog as-is
- Long commit lists are truncated to 50 commits

## GitHub Actions

```yaml
- run: npx bonvoy shipit
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```
