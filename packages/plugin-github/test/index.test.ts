import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitHubPlugin from '../src/github.js';

const mockCreateRelease = vi.fn();
const mockExeca = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    repos = {
      createRelease: mockCreateRelease,
    };
  },
}));

vi.mock('execa', () => ({
  execa: mockExeca,
}));

describe('GitHubPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  it('should have correct name', () => {
    const plugin = new GitHubPlugin();
    expect(plugin.name).toBe('github');
  });

  it('should register makeRelease hook', () => {
    const plugin = new GitHubPlugin();
    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.makeRelease.tapPromise).toHaveBeenCalledWith(
      'github',
      expect.any(Function),
    );
  });

  it('should skip in dry-run mode', async () => {
    const plugin = new GitHubPlugin();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: true,
      changedPackages: [],
      versions: {},
      changelogs: {},
      rootPath: '/test',
    });

    expect(consoleSpy).toHaveBeenCalledWith('🔍 [dry-run] Would create GitHub releases');
    consoleSpy.mockRestore();
  });

  it('should warn if GITHUB_TOKEN is missing', async () => {
    const plugin = new GitHubPlugin();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      changedPackages: [],
      versions: {},
      changelogs: {},
      rootPath: '/test',
    });

    expect(consoleSpy).toHaveBeenCalledWith('⚠️  GITHUB_TOKEN not found, skipping GitHub releases');
    consoleSpy.mockRestore();
  });

  it('should create GitHub release', async () => {
    mockCreateRelease.mockResolvedValue({
      data: { html_url: 'https://github.com/test/repo/releases/tag/v1.0.0' },
    });
    mockExeca.mockResolvedValue({ stdout: 'https://github.com/test/repo.git' });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
      versions: { 'test-pkg': '1.0.0' },
      changelogs: { 'test-pkg': '# Changelog\n\n## 1.0.0\n- Initial release' },
      rootPath: '/test',
    });

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner: 'test',
      repo: 'repo',
      tag_name: 'test-pkg@1.0.0',
      name: 'test-pkg v1.0.0',
      body: '# Changelog\n\n## 1.0.0\n- Initial release',
      draft: false,
      prerelease: false,
    });
    expect(consoleSpy).toHaveBeenCalledWith('✅ Created GitHub release: test-pkg@1.0.0');
    consoleSpy.mockRestore();
  });

  it('should detect prerelease from version', async () => {
    mockCreateRelease.mockResolvedValue({
      data: { html_url: 'https://github.com/test/repo/releases/tag/v1.0.0-beta.1' },
    });
    mockExeca.mockResolvedValue({ stdout: 'https://github.com/test/repo.git' });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
      versions: { 'test-pkg': '1.0.0-beta.1' },
      changelogs: { 'test-pkg': '# Changelog' },
      rootPath: '/test',
    });

    expect(mockCreateRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        prerelease: true,
      }),
    );
    consoleSpy.mockRestore();
  });

  it('should use options for owner and repo', async () => {
    mockCreateRelease.mockResolvedValue({
      data: { html_url: 'https://github.com/custom/repo/releases/tag/v1.0.0' },
    });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin({ owner: 'custom', repo: 'custom-repo' });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
      versions: { 'test-pkg': '1.0.0' },
      changelogs: { 'test-pkg': '# Changelog' },
      rootPath: '/test',
    });

    expect(mockCreateRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'custom',
        repo: 'custom-repo',
      }),
    );
    consoleSpy.mockRestore();
  });

  it('should handle release creation error', async () => {
    mockCreateRelease.mockRejectedValue(new Error('API error'));
    mockExeca.mockResolvedValue({ stdout: 'https://github.com/test/repo.git' });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];

    await expect(
      hookFn({
        isDryRun: false,
        changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: { 'test-pkg': '# Changelog' },
        rootPath: '/test',
      }),
    ).rejects.toThrow('API error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Failed to create release for test-pkg@1.0.0:',
      'API error',
    );
    consoleErrorSpy.mockRestore();
  });

  it('should throw error when repo cannot be determined', async () => {
    mockExeca.mockRejectedValue(new Error('git error'));

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];

    await expect(
      hookFn({
        isDryRun: false,
        changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: { 'test-pkg': '# Changelog' },
        rootPath: '/test',
      }),
    ).rejects.toThrow('Could not determine GitHub repository');
  });

  it('should throw error when git remote URL is invalid', async () => {
    mockExeca.mockResolvedValue({ stdout: 'https://invalid-url.com/repo.git' });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];

    await expect(
      hookFn({
        isDryRun: false,
        changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: { 'test-pkg': '# Changelog' },
        rootPath: '/test',
      }),
    ).rejects.toThrow('Could not determine GitHub repository');
  });

  it('should handle non-Error exceptions', async () => {
    mockCreateRelease.mockRejectedValue('string error');
    mockExeca.mockResolvedValue({ stdout: 'https://github.com/test/repo.git' });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];

    await expect(
      hookFn({
        isDryRun: false,
        changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: { 'test-pkg': '# Changelog' },
        rootPath: '/test',
      }),
    ).rejects.toThrow('string error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '❌ Failed to create release for test-pkg@1.0.0:',
      'string error',
    );
    consoleErrorSpy.mockRestore();
  });

  it('should handle missing changelog', async () => {
    mockCreateRelease.mockResolvedValue({
      data: { html_url: 'https://github.com/test/repo/releases/tag/v1.0.0' },
    });
    mockExeca.mockResolvedValue({ stdout: 'https://github.com/test/repo.git' });

    process.env.GITHUB_TOKEN = 'test-token';

    const plugin = new GitHubPlugin();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockBonvoy = {
      hooks: {
        makeRelease: {
          tapPromise: vi.fn(),
        },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      changedPackages: [{ name: 'test-pkg', path: '/test/pkg' }],
      versions: { 'test-pkg': '1.0.0' },
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockCreateRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '',
      }),
    );
    consoleSpy.mockRestore();
  });
});
