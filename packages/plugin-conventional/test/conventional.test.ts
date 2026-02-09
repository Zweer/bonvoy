import { Bonvoy } from '@bonvoy/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConventionalPlugin from '../src/conventional.js';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// Helper function to create mock CommitInfo
const createMockCommit = (message: string) => ({
  hash: 'abc123',
  message,
  author: 'test@example.com',
  date: new Date(),
  files: ['src/test.ts'],
  packages: ['@test/package'],
});

describe('ConventionalPlugin', () => {
  let plugin: ConventionalPlugin;
  let bonvoy: Bonvoy;

  beforeEach(() => {
    plugin = new ConventionalPlugin();
    bonvoy = new Bonvoy();
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('conventional');
  });

  it('should register getVersion hook', () => {
    const tapSpy = vi.spyOn(bonvoy.hooks.getVersion, 'tap');
    plugin.apply(bonvoy);
    expect(tapSpy).toHaveBeenCalledWith('conventional', expect.any(Function));
  });

  it('should return none for no commits', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };
    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none');
  });

  it('should return major bump for breaking changes', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('feat!: breaking change')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('major');
  });

  it('should return minor bump for features', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('feat: add feature')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor');
  });

  it('should return patch bump for fixes', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('fix: resolve bug')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('patch');
  });

  it('should return none for non-conventional commits', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('docs: update readme')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none');
  });

  it('should return none for invalid commits', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('invalid commit message')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none');
  });

  it('should use custom config when provided', async () => {
    const customPlugin = new ConventionalPlugin({
      preset: 'custom',
      types: { custom: 'major' },
    });

    customPlugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('custom: new feature')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('major');
  });

  it('should return highest bump when multiple commits', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('fix: bug fix'), createMockCommit('feat: new feature')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor'); // feat > fix
  });

  it('should handle malformed commit messages gracefully', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit(null as unknown as string)],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none');
  });

  it('should handle commits with scope', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('feat(api): add new endpoint')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor');
  });

  it('should use angular preset when preset is undefined', async () => {
    const pluginWithUndefinedPreset = new ConventionalPlugin({
      preset: undefined as unknown as 'angular',
    });
    pluginWithUndefinedPreset.apply(bonvoy);
    const context = {
      commits: [createMockCommit('feat: new feature')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor');
  });

  it('should return current bump when it is higher than candidate', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [
        createMockCommit('feat: major feature'), // minor
        createMockCommit('fix: small fix'), // patch - should not override minor
      ],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor'); // minor wins over patch
  });

  it('should skip unparseable commits and continue processing', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [
        createMockCommit('just some random text without colon'), // will be skipped - no colon
        createMockCommit('feat: valid feature'), // will be processed
      ],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor'); // should get minor from the valid commit
  });

  it('should return none when all commits are unparseable', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [
        createMockCommit('random text'), // no colon
        createMockCommit('another random message'), // no colon
        createMockCommit(''), // empty
      ],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none'); // no valid commits
  });

  it('should return none when commit type is not configured for bump', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [
        createMockCommit('chore: update dependencies'), // valid format but chore is not in angular preset
      ],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none'); // chore type doesn't trigger bump
  });

  it('should return none when commits is undefined', async () => {
    plugin.apply(bonvoy);
    const context = {
      // commits is undefined
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none'); // no commits
  });

  it('should handle breaking change with scope', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('feat(api)!: breaking change with scope')],
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('major');
  });

  it('should handle parsing errors gracefully', async () => {
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit(null as unknown as string)], // This will cause parsing error
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('none');
  });

  it('should handle commits with missing parsed fields', async () => {
    // Test a commit that conventional-commits-parser might return with null fields
    plugin.apply(bonvoy);
    const context = {
      commits: [createMockCommit('feat: ')], // Missing subject - will trigger || fallbacks
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
      actionLog: { record: () => {}, entries: () => [] },
      logger: mockLogger,
    };

    const result = await bonvoy.hooks.getVersion.promise(context);
    expect(result).toBe('minor');
  });
});
