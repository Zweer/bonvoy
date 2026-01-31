import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitPlugin from '../src/git.js';
import type { GitOperations } from '../src/operations.js';

function createMockOps(): GitOperations & { calls: Array<{ method: string; args: any[] }> } {
  const calls: Array<{ method: string; args: any[] }> = [];
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
        beforePublish: { tapPromise: vi.fn() },
      },
    };
  });

  it('should register hooks', () => {
    plugin.apply(mockBonvoy);
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
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toContainEqual({ method: 'add', args: ['.', '/project'] });
    expect(mockOps.calls).toContainEqual({
      method: 'commit',
      args: ['chore(release): :bookmark: @test/package-a, @test/package-b [skip ci]', '/project'],
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
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toContainEqual({
      method: 'commit',
      args: ['release: @test/package', '/project'],
    });
  });

  it('should use custom tag format', async () => {
    plugin = new GitPlugin({ tagFormat: 'v{version}' }, mockOps);
    plugin.apply(mockBonvoy);

    const context = {
      packages: [{ name: '@test/package', version: '1.0.0' }],
      rootPath: '/project',
      isDryRun: false,
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
    };

    const beforePublishFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await beforePublishFn(context);

    expect(mockOps.calls).toHaveLength(0);
  });
});
