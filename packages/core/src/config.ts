import { parse as parseToml } from '@iarna/toml';
import { cosmiconfig } from 'cosmiconfig';
import deepmerge from 'deepmerge';

import { type BonvoyConfig, BonvoyConfigSchema } from './schema.js';

const DEFAULT_CONFIG = BonvoyConfigSchema.parse({});

export async function loadConfig(
  rootPath: string = process.cwd(),
  configPath?: string,
): Promise<BonvoyConfig> {
  const explorer = cosmiconfig('bonvoy', {
    searchPlaces: [
      'bonvoy.config.js',
      'bonvoy.config.mjs',
      'bonvoy.config.ts',
      'bonvoy.config.json',
      'bonvoy.config.yaml',
      'bonvoy.config.yml',
      'bonvoy.config.toml',
      '.bonvoyrc',
      '.bonvoyrc.json',
      '.bonvoyrc.yaml',
      '.bonvoyrc.yml',
      'package.json',
    ],
    loaders: {
      '.toml': (_filepath, content) => parseToml(content),
    },
  });

  try {
    const result = configPath ? await explorer.load(configPath) : await explorer.search(rootPath);
    const userConfig = result?.config || {};

    // Validate user config with Zod
    const validatedConfig = BonvoyConfigSchema.parse(userConfig) as BonvoyConfig;
    return mergeConfig(DEFAULT_CONFIG, validatedConfig);
  } catch (error) {
    // If validation fails, throw with helpful message
    if (error instanceof Error && 'issues' in error) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    // If any other error occurs, return default config
    return DEFAULT_CONFIG;
  }
}

export function mergeConfig(base: BonvoyConfig, override: Partial<BonvoyConfig>): BonvoyConfig {
  return deepmerge(base, override as BonvoyConfig) as BonvoyConfig;
}
