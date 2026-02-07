import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitPlugin from '../src/git.js';
import type { GitOperations } from '../src/operations.js';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function createMockOps(
  config: { existingTags?: string[] } = {},
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
): GitOperations & { calls: Array<{ method: string; args: any[] }> } {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  const existingTags = new Set(config.existingTags ?? []);
  return {
    calls,
    async add(files, cwd) {
      calls.push({ method: 'add', args: [files, cwd] });
    },
    async commit(message, cwd) {
      calls.push({ method: 'commit', args: [message, cwd] });
    },
    async tag(name, cwd) {
      calls.push({ method: 'tag', args: [name, cwd] });
    },
    async push(cwd) {
      calls.push({ method: 'push', args: [cwd] });
    },
    async pushTags(tags, cwd) {
      calls.push({ method: 'pushTags', args: [tags, cwd] });
    },
    async checkout() {},
    async getCurrentBranch() {
      return 'feature-branch';
    },
    async tagExists(name) {
      return existingTags.has(name);
    },
    async getLastTag() {
      return null;
    },
    async getCommitsSinceTag() {
      return [];
    },
  };
}

describe('GitPlugin', () => {
  let mockOps: ReturnType<typeof createMockOps>;
  let plugin: GitPlugin;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object for testing
  let mockBonvoy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOps = createMockOps();
    plugin = new GitPlugin({}, mockOps);
    mockBonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
      },
    };
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);
    expect(mockBonvoy.hooks.validateRepo.tapPromise).toHaveBeenCalledWith(
      'git',
      expect.any(Function),
    );
    expect(mockBonvoy.hooks.beforePublish.tapPromise).toHaveBeenCalledWith(
      'git',
      expect.any(Function),
    );
  });

  it('should commit changes with default message', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [
        { name: '@test/package-a', version: '1.0.0' },
        { name: '@test/package-b', version: '2.0.0' },
      ],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toContainEqual({ method: 'add', args: ['.', '/project'] });
    expect(mockOps.calls).toContainEqual({
      method: 'commit',
      args: [
        'chore: :bookmark: release\n\n- @test/package-a@1.0.0\n- @test/package-b@2.0.0',
        '/project',
      ],
    });
    expect(mockOps.calls).toContainEqual({
      method: 'tag',
      args: ['@test/package-a@1.0.0', '/project'],
    });
    expect(mockOps.calls).toContainEqual({
      method: 'tag',
      args: ['@test/package-b@2.0.0', '/project'],
    });
    expect(mockOps.calls).toContainEqual({ method: 'push', args: ['/project'] });
    expect(mockOps.calls).toContainEqual({
      method: 'pushTags',
      args: [['@test/package-a@1.0.0', '@test/package-b@2.0.0'], '/project'],
    });
  });

  it('should use custom commit message', async () => {
    plugin = new GitPlugin({ commitMessage: 'release: {packages}' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toContainEqual({
      method: 'commit',
      args: ['release: @test/package\n\n- @test/package@1.0.0', '/project'],
    });
  });

  it('should use {details} placeholder in commit message', async () => {
    plugin = new GitPlugin({ commitMessage: 'release\n\n{details}' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toContainEqual({
      method: 'commit',
      args: ['release\n\n- @test/package@1.0.0', '/project'],
    });
  });

  it('should use custom tag format', async () => {
    plugin = new GitPlugin({ tagFormat: 'v{version}' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toContainEqual({ method: 'tag', args: ['v1.0.0', '/project'] });
  });

  it('should not push when disabled', async () => {
    plugin = new GitPlugin({ push: false }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package-a', version: '1.0.0' }],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    const methods = mockOps.calls.map((c) => c.method);
    expect(methods).not.toContain('push');
    expect(methods).not.toContain('pushTags');
  });

  it('should skip commit when no packages', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    const methods = mockOps.calls.map((c) => c.method);
    expect(methods).not.toContain('add');
    expect(methods).not.toContain('commit');
  });

  it('should skip operations in dry-run mode', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      rootPath: '/project',
      isDryRun: true,
      logger: mockLogger,
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toHaveLength(0);
  });

  it('should use default operations when none provided', () => {
    const pluginWithDefaults = new GitPlugin();
    expect(pluginWithDefaults.name).toBe('git');
    // The plugin should work without explicit ops (uses defaultGitOperations internally)
  });

  it('should throw error when tags already exist', async () => {
    const opsWithExistingTags = createMockOps({ existingTags: ['@test/package@1.0.0'] });
    const pluginWithTags = new GitPlugin({}, opsWithExistingTags);
    pluginWithTags.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/package', version: '0.9.0', path: '/project' }],
      versions: { '@test/package': '1.0.0' },
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).rejects.toThrow('git tags already exist');
  });

  it('should pass validation when tags do not exist', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/package', version: '0.9.0', path: '/project' }],
      versions: { '@test/package': '1.0.0' },
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });

  it('should skip validation when no versions provided', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [{ name: '@test/package', version: '0.9.0', path: '/project' }],
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });

  it('should skip package when version not in versions map', async () => {
    plugin.apply(mockBonvoy);

    const context = {
      changedPackages: [
        { name: '@test/package-a', version: '0.9.0', path: '/project' },
        { name: '@test/package-b', version: '0.9.0', path: '/project' },
      ],
      versions: { '@test/package-a': '1.0.0' }, // package-b not in versions
      rootPath: '/project',
      isDryRun: false,
      logger: mockLogger,
    };

    const validateRepoFn = mockBonvoy.hooks.validateRepo.tapPromise.mock.calls[0][1];
    await expect(validateRepoFn(context)).resolves.toBeUndefined();
  });
});
