import { cosmiconfig } from 'cosmiconfig';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig, mergeConfig } from '../src/config.js';

vi.mock('cosmiconfig');

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      const config = await loadConfig('/test');

      expect(config).toEqual({
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
      });
    });

    it('should load and merge user config', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue({
          config: { versioning: 'fixed', workflow: 'pr' },
          filepath: '/test/bonvoy.config.js',
        }),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      const config = await loadConfig('/test');

      expect(config.versioning).toBe('fixed');
      expect(config.workflow).toBe('pr');
      expect(config.baseBranch).toBe('main'); // Default preserved
    });

    it('should handle cosmiconfig errors and return default', async () => {
      const mockExplorer = {
        search: vi.fn().mockRejectedValue(new Error('Parse error')),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      const config = await loadConfig('/test');

      expect(config.versioning).toBe('independent'); // Default
    });

    it('should configure cosmiconfig with all supported formats', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await loadConfig('/test');

      expect(cosmiconfig).toHaveBeenCalledWith('bonvoy', {
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
          '.toml': expect.any(Function),
        },
      });
    });

    it('should call explorer.search with correct path', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await loadConfig('/custom/path');

      expect(mockExplorer.search).toHaveBeenCalledWith('/custom/path');
    });

    it('should test TOML loader function', () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      loadConfig('/test');

      // Get the loader function that was passed to cosmiconfig
      const cosmiconfigCall = vi.mocked(cosmiconfig).mock.calls[0];
      const options = cosmiconfigCall[1];
      const tomlLoader = options?.loaders?.['.toml'];

      expect(tomlLoader).toBeDefined();

      // Test the TOML loader function
      const tomlContent = 'versioning = "fixed"';
      const result = tomlLoader?.('/test/config.toml', tomlContent);

      expect(result).toEqual({ versioning: 'fixed' });
    });
  });

  describe('mergeConfig', () => {
    it('should merge configs with deepmerge', () => {
      const base = {
        versioning: 'independent' as const,
        changelog: {
          global: false,
          sections: { feat: 'Features' },
        },
      };

      const override = {
        versioning: 'fixed' as const,
        changelog: {
          sections: { fix: 'Fixes' },
        },
      };

      const result = mergeConfig(base, override);

      expect(result).toEqual({
        versioning: 'fixed',
        changelog: {
          global: false,
          sections: {
            feat: 'Features',
            fix: 'Fixes',
          },
        },
      });
    });

    it('should handle deep nested merging', () => {
      const base = {
        changelog: {
          sections: {
            feat: 'Features',
            fix: 'Fixes',
          },
        },
      };

      const override = {
        changelog: {
          sections: {
            feat: 'New Features', // Override
            perf: 'Performance', // Add
          },
        },
      };

      const result = mergeConfig(base, override);

      expect(result.changelog?.sections).toEqual({
        feat: 'New Features',
        fix: 'Fixes',
        perf: 'Performance',
      });
    });
  });
});
