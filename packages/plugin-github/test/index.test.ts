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
    async createPR(token: string, params) {
      calls.push({ method: 'createPR', args: [token, params] });
      return { url: 'https://github.com/test/repo/pull/1', number: 1 };
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

  const createMockBonvoy = () => ({
    hooks: {
      makeRelease: { tapPromise: vi.fn() },
      createPR: { tapPromise: vi.fn() },
    },
  });

  it('should register makeRelease hook', () => {
    const plugin = new GitHubPlugin();
    const mockBonvoy = createMockBonvoy();

    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.makeRelease.tapPromise).toHaveBeenCalledWith(
      'github',
      expect.any(Function),
    );
  });

  it('should skip in dry-run mode', async () => {
    const plugin = new GitHubPlugin();
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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
      calls: [] as { method: string; args: unknown[] }[],
      async createRelease() {
        throw new Error('API error');
      },
      async createPR() {
        return { url: '', number: 0 };
      },
    };
    const plugin = new GitHubPlugin({ token: 'test-token', owner: 'test', repo: 'repo' }, mockOps);
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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
      calls: [] as { method: string; args: unknown[] }[],
      async createRelease() {
        throw 'string error';
      },
      async createPR() {
        return { url: '', number: 0 };
      },
    };
    const plugin = new GitHubPlugin({ token: 'test-token', owner: 'test', repo: 'repo' }, mockOps);
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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
    const mockBonvoy = createMockBonvoy();

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

  describe('createPR hook', () => {
    it('should skip PR creation in dry-run mode', async () => {
      const mockOps = createMockOps();
      const plugin = new GitHubPlugin({ token: 'test-token', owner: 'org', repo: 'repo' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const hookFn = mockBonvoy.hooks.createPR.tapPromise.mock.calls[0][1];
      await hookFn({
        isDryRun: true,
        logger: mockLogger,
        branchName: 'release/123',
        baseBranch: 'main',
        title: 'Release',
        body: 'Body',
        rootPath: '/test',
      });

      expect(mockOps.calls).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('🔍 [dry-run] Would create GitHub PR');
    });

    it('should skip PR creation without token', async () => {
      const mockOps = createMockOps();
      const plugin = new GitHubPlugin({ owner: 'org', repo: 'repo' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const hookFn = mockBonvoy.hooks.createPR.tapPromise.mock.calls[0][1];
      await hookFn({
        isDryRun: false,
        logger: mockLogger,
        branchName: 'release/123',
        baseBranch: 'main',
        title: 'Release',
        body: 'Body',
        rootPath: '/test',
      });

      expect(mockOps.calls).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  GITHUB_TOKEN not found, skipping PR creation',
      );
    });

    it('should create PR and set context properties', async () => {
      const mockOps = createMockOps();
      const plugin = new GitHubPlugin({ token: 'test-token', owner: 'org', repo: 'repo' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const hookFn = mockBonvoy.hooks.createPR.tapPromise.mock.calls[0][1];
      const context = {
        isDryRun: false,
        logger: mockLogger,
        branchName: 'release/123',
        baseBranch: 'main',
        title: 'Release',
        body: 'Body',
        rootPath: '/test',
      };

      await hookFn(context);

      expect(mockOps.calls).toHaveLength(1);
      expect(mockOps.calls[0].method).toBe('createPR');
      expect(context).toHaveProperty('prUrl', 'https://github.com/test/repo/pull/1');
      expect(context).toHaveProperty('prNumber', 1);
    });

    it('should handle createPR errors', async () => {
      const mockOps = {
        calls: [] as { method: string; args: unknown[] }[],
        async createRelease() {},
        async createPR() {
          throw new Error('PR creation failed');
        },
      };
      const plugin = new GitHubPlugin({ token: 'test-token', owner: 'org', repo: 'repo' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const hookFn = mockBonvoy.hooks.createPR.tapPromise.mock.calls[0][1];
      await expect(
        hookFn({
          isDryRun: false,
          logger: mockLogger,
          branchName: 'release/123',
          baseBranch: 'main',
          title: 'Release',
          body: 'Body',
          rootPath: '/test',
        }),
      ).rejects.toThrow('PR creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to create PR: PR creation failed');
    });

    it('should handle createPR non-Error throws', async () => {
      const mockOps = {
        calls: [] as { method: string; args: unknown[] }[],
        async createRelease() {},
        async createPR() {
          throw 'string error';
        },
      };
      const plugin = new GitHubPlugin({ token: 'test-token', owner: 'org', repo: 'repo' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const hookFn = mockBonvoy.hooks.createPR.tapPromise.mock.calls[0][1];
      await expect(
        hookFn({
          isDryRun: false,
          logger: mockLogger,
          branchName: 'release/123',
          baseBranch: 'main',
          title: 'Release',
          body: 'Body',
          rootPath: '/test',
        }),
      ).rejects.toBe('string error');

      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to create PR: string error');
    });
  });
});
