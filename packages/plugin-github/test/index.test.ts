import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitHubPlugin from '../src/github.js';
import type { GitHubOperations, GitHubReleaseParams } from '../src/operations.js';

vi.mock('node:fs');

function createMockOps(): GitHubOperations & { calls: Array<{ method: string; args: any[] }> } {
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
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
      changedPackages: [],
      versions: {},
      changelogs: {},
      rootPath: '/test',
    });

    expect(consoleSpy).toHaveBeenCalledWith('⚠️  GITHUB_TOKEN not found, skipping GitHub releases');
    consoleSpy.mockRestore();
  });

  it('should create releases for changed packages', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin(
      { token: 'test-token', owner: 'test-owner', repo: 'test-repo' },
      mockOps,
    );
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
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

    consoleSpy.mockRestore();
  });

  it('should read repo from package.json', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token' }, mockOps);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
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
      changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      versions: { 'test-pkg': '1.0.0' },
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockOps.calls[0].args[1].owner).toBe('my-org');
    expect(mockOps.calls[0].args[1].repo).toBe('my-repo');

    consoleSpy.mockRestore();
  });

  it('should detect prerelease versions', async () => {
    const mockOps = createMockOps();
    const plugin = new GitHubPlugin({ token: 'test-token', owner: 'test', repo: 'repo' }, mockOps);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.makeRelease.tapPromise.mock.calls[0][1];
    await hookFn({
      isDryRun: false,
      changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      versions: { 'test-pkg': '1.0.0-beta.1' },
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockOps.calls[0].args[1].prerelease).toBe(true);

    consoleSpy.mockRestore();
  });
});
