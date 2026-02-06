import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitLabPlugin from '../src/gitlab.js';
import type { GitLabOperations, GitLabReleaseParams } from '../src/operations.js';

vi.mock('node:fs');

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
function createMockOps(): GitLabOperations & { calls: any[] } {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: any[] = [];
  return {
    calls,
    async createRelease(token, host, params) {
      calls.push({ method: 'createRelease', token, host, params });
    },
    async createMR(token, host, params) {
      calls.push({ method: 'createMR', token, host, params });
      return { url: 'https://gitlab.com/test/repo/-/merge_requests/1', iid: 1 };
    },
    async releaseExists(_token, _host, _projectId, _tagName) {
      return false;
    },
  };
}

describe('GitLabPlugin', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
    delete process.env.GITLAB_TOKEN;
    delete process.env.GITLAB_HOST;
  });

  it('should have correct name', () => {
    const plugin = new GitLabPlugin();
    expect(plugin.name).toBe('gitlab');
  });

  const createMockBonvoy = () => ({
    hooks: {
      validateRepo: { tapPromise: vi.fn() },
      makeRelease: { tapPromise: vi.fn() },
      createPR: { tapPromise: vi.fn() },
    },
  });

  it('should skip in dry-run mode', async () => {
    const plugin = new GitLabPlugin();
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

    expect(mockLogger.info).toHaveBeenCalledWith('🔍 [dry-run] Would create GitLab releases');
  });

  it('should warn if GITLAB_TOKEN is missing', async () => {
    const plugin = new GitLabPlugin();
    const mockBonvoy = createMockBonvoy();

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ repository: 'https://gitlab.com/org/repo' }) },
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
      '⚠️  GITLAB_TOKEN not found, skipping GitLab releases',
    );
  });

  it('should create releases for changed packages', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'group/project' }, mockOps);
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
    expect(mockOps.calls[0].params).toMatchObject({
      projectId: 'group/project',
      tagName: '@test/pkg@1.1.0',
      name: '@test/pkg v1.1.0',
      description: '## Changes\n- Added feature',
    });
  });

  it('should read project from package.json', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = createMockBonvoy();

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          repository: { url: 'https://gitlab.com/my-org/my-repo.git' },
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

    expect(mockOps.calls[0].params.projectId).toBe('my-org%2Fmy-repo');
  });

  it('should read project from string repository field', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = createMockBonvoy();

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ repository: 'https://gitlab.com/org/repo' }) },
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

    expect(mockOps.calls[0].params.projectId).toBe('org%2Frepo');
  });

  it('should use custom host', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin(
      { token: 'test-token', host: 'https://gitlab.example.com', projectId: 'proj' },
      mockOps,
    );
    const mockBonvoy = createMockBonvoy();

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

    expect(mockOps.calls[0].host).toBe('https://gitlab.example.com');
  });

  it('should use GITLAB_HOST env var', async () => {
    process.env.GITLAB_HOST = 'https://gitlab.env.com';
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
    const mockBonvoy = createMockBonvoy();

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

    expect(mockOps.calls[0].host).toBe('https://gitlab.env.com');
  });

  it('should throw when project cannot be determined', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token' }, mockOps);
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
    ).rejects.toThrow('Could not determine GitLab project');
  });

  it('should throw when createRelease fails', async () => {
    const mockOps = {
      calls: [] as { token: string; host: string; params: GitLabReleaseParams }[],
      async createRelease() {
        throw new Error('API error');
      },
      async createMR() {
        return { url: '', iid: 0 };
      },
      async releaseExists() {
        return false;
      },
    };
    const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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

  it('should handle non-Error throws', async () => {
    const mockOps = {
      calls: [] as { token: string; host: string; params: GitLabReleaseParams }[],
      async createRelease() {
        throw 'string error';
      },
      async createMR() {
        return { url: '', iid: 0 };
      },
      async releaseExists() {
        return false;
      },
    };
    const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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

  it('should use GITLAB_TOKEN from env', async () => {
    process.env.GITLAB_TOKEN = 'env-token';
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ projectId: 'proj' }, mockOps);
    const mockBonvoy = createMockBonvoy();

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

    expect(mockOps.calls[0].token).toBe('env-token');
  });

  it('should throw when repo URL is not GitLab', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = createMockBonvoy();

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ repository: 'https://github.com/org/repo' }) },
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
    ).rejects.toThrow('Could not determine GitLab project');
  });

  it('should handle subgroups in project path', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ token: 'test-token' }, mockOps);
    const mockBonvoy = createMockBonvoy();

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          repository: 'https://gitlab.com/org/subgroup/repo',
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

    expect(mockOps.calls[0].params.projectId).toBe('org%2Fsubgroup%2Frepo');
  });

  it('should use custom tagFormat', async () => {
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin(
      { token: 'test-token', projectId: 'proj', tagFormat: 'v{version}/{name}' },
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
      changelogs: {},
      rootPath: '/test',
    });

    expect(mockOps.calls[0].params.tagName).toBe('v1.1.0/@test/pkg');
  });

  describe('validateRepo hook', () => {
    it('should pass when no releases exist', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const validateFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
      await expect(
        validateFn({
          isDryRun: false,
          logger: mockLogger,
          changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
          versions: { 'test-pkg': '1.1.0' },
          rootPath: '/test',
        }),
      ).resolves.toBeUndefined();
    });

    it('should throw when releases already exist', async () => {
      const mockOps = createMockOps();
      mockOps.releaseExists = async () => true;
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const validateFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
      await expect(
        validateFn({
          isDryRun: false,
          logger: mockLogger,
          changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
          versions: { 'test-pkg': '1.1.0' },
          rootPath: '/test',
        }),
      ).rejects.toThrow('Cannot release: GitLab releases already exist');
    });

    it('should skip validation without token', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ projectId: 'proj' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const validateFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
      await expect(
        validateFn({
          isDryRun: false,
          logger: mockLogger,
          changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
          versions: { 'test-pkg': '1.1.0' },
          rootPath: '/test',
        }),
      ).resolves.toBeUndefined();
    });

    it('should skip validation without versions', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      plugin.apply(mockBonvoy);

      const validateFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
      await expect(
        validateFn({
          isDryRun: false,
          logger: mockLogger,
          changedPackages: [],
          rootPath: '/test',
        }),
      ).resolves.toBeUndefined();
    });

    it('should skip validation when project cannot be determined', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ token: 'test-token' }, mockOps);
      const mockBonvoy = createMockBonvoy();

      vol.fromJSON({ '/test/package.json': JSON.stringify({ name: 'test' }) }, '/');

      plugin.apply(mockBonvoy);

      const validateFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
      await expect(
        validateFn({
          isDryRun: false,
          logger: mockLogger,
          changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
          versions: { 'test-pkg': '1.1.0' },
          rootPath: '/test',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('createPR hook', () => {
    it('should skip MR creation in dry-run mode', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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
      expect(mockLogger.info).toHaveBeenCalledWith('🔍 [dry-run] Would create GitLab MR');
    });

    it('should skip MR creation without token', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ projectId: 'proj' }, mockOps);
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
        '⚠️  GITLAB_TOKEN not found, skipping MR creation',
      );
    });

    it('should create MR and set context properties', async () => {
      const mockOps = createMockOps();
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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
      expect(context).toHaveProperty('prUrl', 'https://gitlab.com/test/repo/-/merge_requests/1');
      expect(context).toHaveProperty('prNumber', 1);
    });

    it('should handle createMR errors', async () => {
      const mockOps = {
        calls: [] as { token: string; host: string; params: GitLabReleaseParams }[],
        async createRelease() {},
        async createMR() {
          throw new Error('MR creation failed');
        },
        async releaseExists() {
          return false;
        },
      };
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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
      ).rejects.toThrow('MR creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to create MR: MR creation failed');
    });

    it('should handle createMR non-Error throws', async () => {
      const mockOps = {
        calls: [] as { token: string; host: string; params: GitLabReleaseParams }[],
        async createRelease() {},
        async createMR() {
          throw 'string error';
        },
        async releaseExists() {
          return false;
        },
      };
      const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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

      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to create MR: string error');
    });
  });
});
