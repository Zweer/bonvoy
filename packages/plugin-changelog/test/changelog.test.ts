import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChangelogPlugin from '../src/changelog.js';

// Mock the writer module
vi.mock('../src/writer.js', () => ({
  writeChangelog: vi.fn(),
}));

const createMockCommit = (message: string, packages: string[] = ['@test/package']) => ({
  hash: 'abc1234567890',
  message,
  author: 'test@example.com',
  date: new Date('2026-01-10'),
  files: ['src/test.ts'],
  packages,
});

const createMockPackage = (name = '@test/package', version = '1.0.0') => ({
  name,
  version,
  path: `/test/${name}`,
  packageJson: { name, version },
});

describe('ChangelogPlugin', () => {
  let plugin: ChangelogPlugin;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
  let mockBonvoy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10'));

    plugin = new ChangelogPlugin();
    mockBonvoy = {
      hooks: {
        generateChangelog: { tap: vi.fn() },
        afterChangelog: { tapPromise: vi.fn() },
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.generateChangelog.tap).toHaveBeenCalledWith(
      'changelog',
      expect.any(Function),
    );
    expect(mockBonvoy.hooks.afterChangelog.tapPromise).toHaveBeenCalledWith(
      'changelog',
      expect.any(Function),
    );
  });

  it('should generate changelog for package commits', () => {
    plugin.apply(mockBonvoy);

    const generateFn = vi.mocked(mockBonvoy.hooks.generateChangelog.tap).mock.calls[0][1];
    const context = {
      commits: [
        createMockCommit('feat: add feature', ['@test/package']),
        createMockCommit('fix: resolve bug', ['@test/package']),
      ],
      currentPackage: createMockPackage('@test/package', '1.0.0'),
      versions: { '@test/package': '1.0.0' },
      bumps: { '@test/package': 'minor' },
      changelogs: {},
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    const result = generateFn(context);

    expect(result).toContain('## [1.0.0] - 2026-01-10');
    expect(result).toContain('### ✨ Features');
    expect(result).toContain('- feat: add feature');
    expect(result).toContain('### 🐛 Bug Fixes');
    expect(result).toContain('- fix: resolve bug');
  });

  it('should filter commits by package', () => {
    plugin.apply(mockBonvoy);

    const generateFn = vi.mocked(mockBonvoy.hooks.generateChangelog.tap).mock.calls[0][1];
    const context = {
      commits: [
        createMockCommit('feat: package A feature', ['@test/package-a']),
        createMockCommit('fix: package B fix', ['@test/package-b']),
        createMockCommit('perf: shared optimization', ['@test/package-a', '@test/package-b']),
      ],
      currentPackage: createMockPackage('@test/package-a', '1.0.0'),
      versions: { '@test/package-a': '1.0.0' },
      bumps: { '@test/package-a': 'minor' },
      changelogs: {},
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    const result = generateFn(context);

    expect(result).toContain('- feat: package A feature');
    expect(result).toContain('- perf: shared optimization');
    expect(result).not.toContain('- fix: package B fix');
  });

  it('should return empty string for no commits', () => {
    plugin.apply(mockBonvoy);

    const generateFn = vi.mocked(mockBonvoy.hooks.generateChangelog.tap).mock.calls[0][1];
    const context = {
      commits: [],
      currentPackage: createMockPackage('@test/package', '1.0.0'),
      versions: {},
      bumps: {},
      changelogs: {},
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    const result = generateFn(context);

    expect(result).toBe('');
  });

  it('should return empty string for no current package', () => {
    plugin.apply(mockBonvoy);

    const generateFn = vi.mocked(mockBonvoy.hooks.generateChangelog.tap).mock.calls[0][1];
    const context = {
      commits: [createMockCommit('feat: add feature')],
      currentPackage: undefined,
      versions: {},
      bumps: {},
      changelogs: {},
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    const result = generateFn(context);

    expect(result).toBe('');
  });

  it('should use custom configuration', () => {
    const customPlugin = new ChangelogPlugin({
      sections: {
        feat: '🚀 New Features',
        fix: '🔧 Bug Fixes',
      },
      includeCommitHash: true,
    });

    customPlugin.apply(mockBonvoy);

    const generateFn = vi.mocked(mockBonvoy.hooks.generateChangelog.tap).mock.calls[0][1];
    const context = {
      commits: [createMockCommit('feat: add feature', ['@test/package'])],
      currentPackage: createMockPackage('@test/package', '1.0.0'),
      versions: { '@test/package': '1.0.0' },
      bumps: { '@test/package': 'minor' },
      changelogs: {},
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    const result = generateFn(context);

    expect(result).toContain('### 🚀 New Features');
    expect(result).toContain('- feat: add feature (abc1234)');
  });

  it('should write changelog files', async () => {
    const { writeChangelog } = await import('../src/writer.js');

    plugin.apply(mockBonvoy);

    const afterChangelogFn = vi.mocked(mockBonvoy.hooks.afterChangelog.tapPromise).mock.calls[0][1];
    const context = {
      commits: [],
      versions: { '@test/package': '1.0.0' },
      bumps: { '@test/package': 'minor' },
      changelogs: {
        '@test/package': '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature',
      },
      config: {},
      packages: [createMockPackage('@test/package', '1.0.0')],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    await afterChangelogFn(context);

    expect(writeChangelog).toHaveBeenCalledWith(
      '/test/@test/package',
      '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature',
      '1.0.0',
    );
  });

  it('should generate global changelog when enabled', async () => {
    const globalPlugin = new ChangelogPlugin({ global: true });
    const { writeChangelog } = await import('../src/writer.js');

    globalPlugin.apply(mockBonvoy);

    const afterChangelogFn = vi.mocked(mockBonvoy.hooks.afterChangelog.tapPromise).mock.calls[0][1];
    const context = {
      commits: [],
      versions: { '@test/package-a': '1.0.0', '@test/package-b': '2.0.0' },
      bumps: { '@test/package-a': 'minor', '@test/package-b': 'major' },
      changelogs: {
        '@test/package-a': '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature A',
        '@test/package-b':
          '## [2.0.0] - 2026-01-10\n\n### 💥 Breaking Changes\n- feat!: breaking change B',
      },
      config: {},
      packages: [
        createMockPackage('@test/package-a', '1.0.0'),
        createMockPackage('@test/package-b', '2.0.0'),
      ],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    await afterChangelogFn(context);

    expect(writeChangelog).toHaveBeenCalledWith(
      '/test',
      expect.stringContaining('## @test/package-a'),
      'global',
    );
    expect(writeChangelog).toHaveBeenCalledWith(
      '/test',
      expect.stringContaining('## @test/package-b'),
      'global',
    );
  });

  it('should return empty string when no commits match package', () => {
    plugin.apply(mockBonvoy);

    const generateFn = vi.mocked(mockBonvoy.hooks.generateChangelog.tap).mock.calls[0][1];
    const context = {
      commits: [
        createMockCommit('feat: add feature', ['@other/package']), // Different package
      ],
      currentPackage: createMockPackage('@test/package', '1.0.0'),
      versions: { '@test/package': '1.0.0' },
      bumps: { '@test/package': 'minor' },
      changelogs: {},
      config: {},
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    const result = generateFn(context);

    expect(result).toBe('');
  });

  it('should skip packages without changelog in writeChangelogFiles', async () => {
    const { writeChangelog } = await import('../src/writer.js');
    vi.clearAllMocks(); // Clear previous mock calls

    plugin.apply(mockBonvoy);

    const afterChangelogFn = vi.mocked(mockBonvoy.hooks.afterChangelog.tapPromise).mock.calls[0][1];
    const context = {
      commits: [],
      versions: { '@test/package-a': '1.0.0', '@test/package-b': '2.0.0' },
      bumps: { '@test/package-a': 'minor', '@test/package-b': 'major' },
      changelogs: {
        '@test/package-a': '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature A',
        // '@test/package-b' has no changelog (empty/falsy)
      },
      config: {},
      packages: [
        createMockPackage('@test/package-a', '1.0.0'),
        createMockPackage('@test/package-b', '2.0.0'),
      ],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    await afterChangelogFn(context);

    // Should only be called once for package-a
    expect(writeChangelog).toHaveBeenCalledTimes(1);
    expect(writeChangelog).toHaveBeenCalledWith(
      '/test/@test/package-a',
      '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature A',
      '1.0.0',
    );
  });

  it('should skip packages without changelog in global changelog', async () => {
    const globalPlugin = new ChangelogPlugin({ global: true });
    const { writeChangelog } = await import('../src/writer.js');

    globalPlugin.apply(mockBonvoy);

    const afterChangelogFn = vi.mocked(mockBonvoy.hooks.afterChangelog.tapPromise).mock.calls[0][1];
    const context = {
      commits: [],
      versions: { '@test/package-a': '1.0.0', '@test/package-b': '2.0.0' },
      bumps: { '@test/package-a': 'minor', '@test/package-b': 'major' },
      changelogs: {
        '@test/package-a': '## [1.0.0] - 2026-01-10\n\n### ✨ Features\n- feat: add feature A',
        // '@test/package-b' has no changelog (empty/falsy)
      },
      config: {},
      packages: [
        createMockPackage('@test/package-a', '1.0.0'),
        createMockPackage('@test/package-b', '2.0.0'),
      ],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    await afterChangelogFn(context);

    // Global changelog should only include package-a
    expect(writeChangelog).toHaveBeenCalledWith(
      '/test',
      expect.stringContaining('## @test/package-a'),
      'global',
    );
    expect(writeChangelog).toHaveBeenCalledWith(
      '/test',
      expect.not.stringContaining('## @test/package-b'),
      'global',
    );
  });
});
