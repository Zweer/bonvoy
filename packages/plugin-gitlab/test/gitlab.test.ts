import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitLabPlugin from '../src/gitlab.js';
import type { GitLabOperations, GitLabReleaseParams } from '../src/operations.js';

vi.mock('node:fs');

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function createMockOps(): GitLabOperations & {
  calls: Array<{ token: string; host: string; params: GitLabReleaseParams }>;
} {
  const calls: Array<{ token: string; host: string; params: GitLabReleaseParams }> = [];
  return {
    calls,
    async createRelease(token, host, params) {
      calls.push({ token, host, params });
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

  it('should skip in dry-run mode', async () => {
    const plugin = new GitLabPlugin();
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

    expect(mockLogger.info).toHaveBeenCalledWith('🔍 [dry-run] Would create GitLab releases');
  });

  it('should warn if GITLAB_TOKEN is missing', async () => {
    const plugin = new GitLabPlugin();
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    ).rejects.toThrow('Could not determine GitLab project');
  });

  it('should throw when createRelease fails', async () => {
    const mockOps = {
      calls: [],
      async createRelease() {
        throw new Error('API error');
      },
    };
    const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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

  it('should handle non-Error throws', async () => {
    const mockOps = {
      calls: [],
      async createRelease() {
        throw 'string error';
      },
    };
    const plugin = new GitLabPlugin({ token: 'test-token', projectId: 'proj' }, mockOps);
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

  it('should use GITLAB_TOKEN from env', async () => {
    process.env.GITLAB_TOKEN = 'env-token';
    const mockOps = createMockOps();
    const plugin = new GitLabPlugin({ projectId: 'proj' }, mockOps);
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
    const mockBonvoy = { hooks: { makeRelease: { tapPromise: vi.fn() } } };

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
});
