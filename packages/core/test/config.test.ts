import { cosmiconfig } from 'cosmiconfig';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig, mergeConfig } from '../src/config.js';

vi.mock('cosmiconfig');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: Required for test mocking
type MockExplorer = any;

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
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

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
        conventional: { preset: 'angular' },
        git: { push: true },
        npm: {
          registry: 'https://registry.npmjs.org',
          access: 'public',
          dryRun: false,
          skipExisting: true,
          provenance: true,
        },
        github: { draft: false },
        gitlab: {},
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
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      const config = await loadConfig('/test');

      expect(config.versioning).toBe('fixed');
      expect(config.workflow).toBe('pr');
      expect(config.baseBranch).toBe('main'); // Default preserved
    });

    it('should load custom config file when configPath is provided', async () => {
      const mockExplorer = {
        search: vi.fn(),
        load: vi.fn().mockResolvedValue({
          config: { versioning: 'fixed', commitMessage: 'custom: release all' },
          filepath: '/custom/config.js',
        }),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      const config = await loadConfig('/test', '/custom/config.js');

      expect(mockExplorer.load).toHaveBeenCalledWith('/custom/config.js');
      expect(mockExplorer.search).not.toHaveBeenCalled();
      expect(config.versioning).toBe('fixed');
      expect(config.commitMessage).toBe('custom: release all');
    });

    it('should handle cosmiconfig errors and return default', async () => {
      const mockExplorer = {
        search: vi.fn().mockRejectedValue(new Error('Parse error')),
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      const config = await loadConfig('/test');

      expect(config.versioning).toBe('independent'); // Default
    });

    it('should handle custom config file errors and return default', async () => {
      const mockExplorer = {
        search: vi.fn(),
        load: vi.fn().mockRejectedValue(new Error('File not found')),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      const config = await loadConfig('/test', '/nonexistent/config.js');

      expect(config.versioning).toBe('independent'); // Default
    });

    it('should configure cosmiconfig with all supported formats', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

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
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      await loadConfig('/custom/path');

      expect(mockExplorer.search).toHaveBeenCalledWith('/custom/path');
    });

    it('should throw error for invalid config with Zod validation', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue({
          config: { versioning: 'invalid-value' }, // Invalid enum value
          filepath: '/test/bonvoy.config.js',
        }),
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      await expect(loadConfig('/test')).rejects.toThrow('Invalid configuration:');
    });

    it('should return default config for non-validation errors', async () => {
      const mockExplorer = {
        search: vi.fn().mockRejectedValue(new Error('Network error')),
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      const config = await loadConfig('/test');

      expect(config.versioning).toBe('independent'); // Should return default
    });

    it('should return default config for non-Zod errors during parsing', async () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue({
          config: { versioning: 'independent' },
          filepath: '/test/bonvoy.config.js',
        }),
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

      // Create a spy on BonvoyConfigSchema.parse to throw a non-Zod error
      const { BonvoyConfigSchema } = await import('../src/schema.js');
      const parseSpy = vi.spyOn(BonvoyConfigSchema, 'parse').mockImplementation(() => {
        const error = new Error('Generic parsing error');
        // Ensure it doesn't have 'issues' property like Zod errors do
        delete (error as unknown as Record<string, unknown>).issues;
        throw error;
      });

      const config = await loadConfig('/test');

      expect(config.versioning).toBe('independent'); // Should return default
      parseSpy.mockRestore();
    });

    it('should test TOML loader function', () => {
      const mockExplorer = {
        search: vi.fn().mockResolvedValue(null),
        load: vi.fn(),
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as MockExplorer);

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
