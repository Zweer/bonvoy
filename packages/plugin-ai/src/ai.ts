import type { BonvoyPlugin, ChangelogContext } from '@bonvoy/core';

import { buildPrompt, insertSummary } from './prompt.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GeminiProvider } from './providers/gemini.js';
import type { AiProvider, ProviderName } from './providers/index.js';
import { OpenAiProvider } from './providers/openai.js';

export interface AiPluginConfig {
  provider: ProviderName;
  model?: string;
  apiKey?: string;
  promptTemplate?: string;
  maxTokens?: number;
}

const ENV_KEYS: Record<ProviderName, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

const DEFAULT_MAX_TOKENS = 200;

export default class AiPlugin implements BonvoyPlugin {
  name = 'ai';
  private provider: AiProvider;
  private config: AiPluginConfig;

  constructor(config: AiPluginConfig) {
    this.config = config;
    const apiKey = config.apiKey ?? process.env[ENV_KEYS[config.provider]];
    if (!apiKey) {
      throw new Error(
        `@bonvoy/plugin-ai: Missing API key. Set ${ENV_KEYS[config.provider]} or pass apiKey in config.`,
      );
    }
    this.provider = this.createProvider(config.provider, apiKey, config.model);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types are complex and vary by implementation
  apply(bonvoy: { hooks: { afterChangelog: any } }): void {
    bonvoy.hooks.afterChangelog.tapPromise(this.name, async (context: ChangelogContext) => {
      const pkg = context.currentPackage;
      if (!pkg || context.isDryRun) return;

      const changelog = context.changelogs[pkg.name];
      if (!changelog) return;

      const commits = context.commits?.filter((c) => c.packages.includes(pkg.name)) ?? [];
      if (!commits.length) return;

      try {
        const prompt = buildPrompt(commits, pkg.name, pkg.version, this.config.promptTemplate);
        const summary = await this.provider.generateText(
          prompt,
          this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
        );
        if (summary) {
          context.changelogs[pkg.name] = insertSummary(changelog, summary);
        }
      } catch (error) {
        context.logger.warn(`  ⚠️ AI summary failed for ${pkg.name}: ${error}`);
      }
    });
  }

  private createProvider(name: ProviderName, apiKey: string, model?: string): AiProvider {
    switch (name) {
      case 'openai':
        return new OpenAiProvider(apiKey, model);
      case 'anthropic':
        return new AnthropicProvider(apiKey, model);
      case 'gemini':
        return new GeminiProvider(apiKey, model);
    }
  }
}
