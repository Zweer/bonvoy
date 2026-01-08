import { parse as parseToml } from '@iarna/toml';
import { cosmiconfig } from 'cosmiconfig';
import deepmerge from 'deepmerge';

import type { BonvoyConfig } from './types.js';

const DEFAULT_CONFIG: BonvoyConfig = {
  versioning: 'independent',
  rootVersionStrategy: 'max',
  commitMessage: 'chore: release {packages}',
  tagFormat: '{name}@{version}',
  changelog: {
    global: false,
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
      perf: '⚡ Performance',
      docs: '📚 Documentation',
      breaking: '💥 Breaking Changes',
    },
  },
  workflow: 'direct',
  baseBranch: 'main',
  plugins: [],
};

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
      '.toml': (filepath, content) => parseToml(content),
    },
  });

  try {
    const result = configPath ? await explorer.load(configPath) : await explorer.search(rootPath);
    const userConfig = result?.config || {};
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch {
    // If any error occurs, return default config
    return DEFAULT_CONFIG;
  }
}

export function mergeConfig(base: BonvoyConfig, override: Partial<BonvoyConfig>): BonvoyConfig {
  return deepmerge(base, override) as BonvoyConfig;
}
