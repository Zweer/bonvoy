import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitHubPlugin from '../src/github.js';
import type { GitHubOperations, GitHubReleaseParams } from '../src/operations.js';

vi.mock('node:fs');

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
function createMockOps(): GitHubOperations & { calls: Array<{ method: string; args: any[] }> } {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  return {
    calls,
    async createRelease(token: string, params: GitHubReleaseParams) {
      calls.push({ method: 'createRelease', args: [token, params] });
    },
  };
}

describe('GitHubPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vol.reset();
    delete process.env.GITHUB_TOKEN;
  });

  it('should have correct name', () => {
    const plugin = new GitHubPlugin();
    expect(plugin.name).toBe('github');
  });

  it('should register makeRelease hook', () => {
    const plugin = new GitHubPlugin();
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.makeRelease.tapPromise).toHaveBeenCalledWith(
      'github',
      expect.any(Function),
    );
  });

  it('should skip in dry-run mode', async () => {
    const plugin = new GitHubPlugin();
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: true,
      logger: mockLogger,
      changedPackages: [],
      versions: {},
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('🔍 [dry-run] Would create GitHub releases');
  });

  it('should warn if GITHUB_TOKEN is missing', async () => {
    const plugin = new GitHubPlugin();
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'test',
          repository: 'https://github.com/test/repo',
        }),
      },
      '/',
    );

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      logger: mockLogger,
      changedPackages: [],
      versions: {},
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      '⚠️  GITHUB_TOKEN not found, skipping GitHub releases',
    );
  });

  it('should create releases for changed packages', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin(
      { token: 'test-token', owner: 'test-owner', repo: 'test-repo' },
      mockOps,
    );
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      logger: mockLogger,
      changedPackages: [{ name: '@test/pkg', version: '1.0.0', path: '/test/pkg' }],
      versions: { '@test/pkg': '1.1.0' },
      changelogs: { '@test/pkg': '## Changes\n- Added feature' },
      rootPath: '/test',
    });

    expect(mockOps.calls).toHaveLength(1);
    expect(mockOps.calls[0].args[0]).toBe('test-token');
    expect(mockOps.calls[0].args[1]).toMatchObject({
      owner: 'test-owner',
      repo: 'test-repo',
      tag_name: '@test/pkg@1.1.0',
      name: '@test/pkg v1.1.0',
      body: '## Changes\n- Added feature',
    });
  });

  it('should read repo from package.json', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'test',
          repository: { url: 'https://github.com/my-org/my-repo.git' },
        }),
      },
      '/',
    );

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      logger: mockLogger,
      changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      versions: { 'test-pkg': '1.0.0' },
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockOps.calls[0].args[1].owner).toBe('my-org');
    expect(mockOps.calls[0].args[1].repo).toBe('my-repo');
  });

  it('should detect prerelease versions', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token', owner: 'test', repo: 'repo' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      logger: mockLogger,
      changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      versions: { 'test-pkg': '1.0.0-beta.1' },
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockOps.calls[0].args[1].prerelease).toBe(true);
  });

  it('should throw when createRelease fails', async () => {
    const mockOps = {
      calls: [],
      async createRelease() {
        throw new Error('API error');
      },
    };
    const plugin = new GitHubPlugin({ token: 'test-token', owner: 'test', repo: 'repo' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await expect(
      hookFn({
        isDryRun: false,
        logger: mockLogger,
        changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: {},
        rootPath: '/test',
      }),
    ).rejects.toThrow('API error');
  });

  it('should throw when repo info cannot be determined', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    vol.fromJSON({ '/test/package.json': JSON.stringify({ name: 'test' }) }, '/');

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await expect(
      hookFn({
        isDryRun: false,
        logger: mockLogger,
        changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: {},
        rootPath: '/test',
      }),
    ).rejects.toThrow('Could not determine GitHub repository');
  });

  it('should handle non-Error throws', async () => {
    const mockOps = {
      calls: [],
      async createRelease() {
        throw 'string error';
      },
    };
    const plugin = new GitHubPlugin({ token: 'test-token', owner: 'test', repo: 'repo' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await expect(
      hookFn({
        isDryRun: false,
        logger: mockLogger,
        changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: {},
        rootPath: '/test',
      }),
    ).rejects.toBe('string error');
  });

  it('should read repo from string repository field', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ repository: 'https://github.com/org/repo' }) },
      '/',
    );

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      logger: mockLogger,
      changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      versions: { 'test-pkg': '1.0.0' },
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockOps.calls[0].args[1].owner).toBe('org');
    expect(mockOps.calls[0].args[1].repo).toBe('repo');
  });

  it('should throw when repo URL is invalid', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ repository: 'https://gitlab.com/org/repo' }) },
      '/',
    );

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await expect(
      hookFn({
        isDryRun: false,
        logger: mockLogger,
        changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
        versions: { 'test-pkg': '1.0.0' },
        changelogs: {},
        rootPath: '/test',
      }),
    ).rejects.toThrow('Could not determine GitHub repository');
  });
});
