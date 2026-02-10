# plugin-ai — AI Release Notes Summary

> Prepend an AI-generated summary to the conventional changelog.

## Problem

Conventional changelogs are accurate but hard to scan. A list of `feat:`, `fix:` commits doesn't tell you the "story" of a release. Users want a quick, human-readable summary without losing the detailed commit list.

## Solution

`@bonvoy/plugin-ai` generates a short summary from the commits using an LLM and prepends it as a blockquote above the conventional changelog.

### Output Example

```markdown
## [0.9.0] - 2026-02-10

> This release adds automatic rollback for failed releases and improves
> error messages across the board. If a publish fails mid-way, bonvoy
> now undoes all completed steps automatically.

### ✨ Features
- add rollback & recovery for failed releases
- show commit justification for each package bump

### 🐛 Bug Fixes
- remove stale release-log.json and gitignore it
- improve error messages for rollback status and npm OIDC
```

The AI summary is a blockquote (`>`), the conventional changelog follows unchanged.

## Architecture

### Hook Integration

The plugin taps into `afterChangelog`. At this point `context.changelogs[pkg.name]` is already populated by the changelog plugin.

```typescript
apply(bonvoy: Bonvoy): void {
  bonvoy.hooks.afterChangelog.tapPromise('ai', async (context) => {
    if (!context.currentPackage || context.isDryRun) return;

    const changelog = context.changelogs[context.currentPackage.name];
    if (!changelog) return;

    const commits = context.commits ?? [];
    const summary = await this.generateSummary(commits, context.currentPackage);
    if (summary) {
      // Prepend blockquote summary after the version header line
      context.changelogs[context.currentPackage.name] = insertSummary(changelog, summary);
    }
  });
}
```

After modifying `changelogs[pkg.name]`, the changelog writer (which runs later in `afterChangelog`) picks up the updated content. If the writer already ran (ordering issue), the plugin re-writes the file itself.

### Provider Abstraction

One file per provider in `providers/`, all implementing the same interface. Uses native `fetch` — no SDK dependencies.

```typescript
interface AiProvider {
  generateText(prompt: string, config: ProviderConfig): Promise<string>;
}
```

| Provider | Endpoint | Auth | Response path |
|----------|----------|------|---------------|
| OpenAI | `POST /v1/chat/completions` | `OPENAI_API_KEY` | `choices[0].message.content` |
| Anthropic | `POST /v1/messages` | `ANTHROPIC_API_KEY` | `content[0].text` |
| Gemini | `POST /v1beta/models/{m}:generateContent` | `GEMINI_API_KEY` | `candidates[0].content.parts[0].text` |

### Prompt

```
You are a release notes writer. Given a list of commits for a software package,
write a 2-3 sentence summary of what changed in this release.

Be concise and specific. Focus on what matters to users, not implementation details.
Do not use bullet points. Do not repeat commit messages verbatim.
Write in present tense ("adds", "fixes", "improves").

Package: {packageName}
Version: {version}

Commits:
{commitList}
```

The prompt template is configurable via `promptTemplate` in config.

## Configuration

```typescript
interface AiPluginConfig {
  /** LLM provider: 'openai' | 'anthropic' | 'gemini' */
  provider: 'openai' | 'anthropic' | 'gemini';

  /** Model name (e.g. 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'gemini-2.0-flash') */
  model?: string;

  /** API key — defaults to env var per provider */
  apiKey?: string;

  /** Custom prompt template with placeholders: {packageName}, {version}, {commitList} */
  promptTemplate?: string;

  /** Max tokens for response (default: 200) */
  maxTokens?: number;
}
```

### Default Models

| Provider | Default Model | Env Var |
|----------|---------------|---------|
| OpenAI | `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| Gemini | `gemini-2.0-flash` | `GEMINI_API_KEY` |

### Usage

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-ai', { provider: 'openai' }],
  ],
};
```

Environment variable for API key:
- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Bedrock: uses AWS credential chain (no key needed in CI with IAM role)

## Behavior

1. Runs after conventional changelog is generated
2. Collects commits for the current package
3. Sends to LLM with the prompt
4. Formats response as blockquote
5. Inserts after the version header, before the first section
6. If LLM call fails: logs a warning, keeps the conventional changelog as-is (no error)

### Dry-run

In dry-run mode, the plugin skips the LLM call entirely (no API cost).

### Monorepo

Each package gets its own summary based on its own commits. The LLM is called once per changed package.

## Package Structure

```
packages/plugin-ai/
├── src/
│   ├── index.ts           # Re-export
│   ├── ai.ts              # Plugin class (apply, hook taps)
│   ├── prompt.ts          # Prompt template + summary insertion
│   └── providers/
│       ├── index.ts       # Provider interface + factory
│       ├── openai.ts      # OpenAI provider (~20 lines)
│       ├── anthropic.ts   # Anthropic provider (~20 lines)
│       └── gemini.ts      # Gemini provider (~20 lines)
├── test/
│   ├── ai.test.ts
│   ├── prompt.test.ts
│   └── providers/
│       ├── openai.test.ts
│       ├── anthropic.test.ts
│       └── gemini.test.ts
├── package.json
└── README.md
```

### Dependencies

- None (uses native `fetch` for HTTP calls)

## Edge Cases

- **No API key**: error at plugin initialization with clear message
- **LLM timeout/error**: warn and skip, keep conventional changelog
- **Empty commits**: skip summary generation
- **Very long commit list**: truncate to last 50 commits in prompt
- **Rate limiting**: use core's `retryWithBackoff` for transient errors

## Implementation Plan

1. `prompt.ts` — prompt template + `insertSummary()` function
2. `providers.ts` — OpenAI + Anthropic providers (Bedrock later)
3. `ai.ts` — plugin class with `afterChangelog` hook
4. Tests with mocked fetch
5. README

---

*Plugin: @bonvoy/plugin-ai*
*Status: ✅ Implemented*
*Priority: Medium*
*Depends on: @bonvoy/core, @bonvoy/plugin-changelog*
*Estimated effort: 1-2 days*
