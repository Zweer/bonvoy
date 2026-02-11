import type { RollbackContext } from '@bonvoy/core';
import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GitHubPlugin from '../src/github.js';
import type { GitHubOperations } from '../src/operations.js';

vi.mock('node:fs');

function createMockOps(): GitHubOperations & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    async createRelease() {
      return { id: 1 };
    },
    async createPR() {
      return { url: '', number: 0 };
    },
    async releaseExists() {
      return false;
    },
    async deleteRelease(_token, owner, repo, releaseId) {
      calls.push({ method: 'deleteRelease', args: [owner, repo, releaseId] });
    },
  };
}

function createRollbackContext(actions: RollbackContext['actions']): RollbackContext {
  return {
    config: {},
    packages: [],
    changedPackages: [],
    rootPath: '/project',
    isDryRun: false,
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      level: 'silent' as const,
    },
    actionLog: { record: vi.fn(), entries: () => [] },
    actions,
    errors: [],
  };
}

describe('GitHubPlugin rollback', () => {
  beforeEach(() => {
    vol.reset();
    process.env.GITHUB_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  it('should delete releases in reverse order', async () => {
    const ops = createMockOps();
    const plugin = new GitHubPlugin({ token: 'tok', owner: 'org', repo: 'repo' }, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'github',
        action: 'release',
        data: { tag: 'v1.0.0', id: 10, owner: 'org', repo: 'repo' },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'github',
        action: 'release',
        data: { tag: 'v2.0.0', id: 20, owner: 'org', repo: 'repo' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ops.calls).toHaveLength(2);
    expect(ops.calls[0].args).toEqual(['org', 'repo', 20]);
    expect(ops.calls[1].args).toEqual(['org', 'repo', 10]);
  });

  it('should warn when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;
    const ops = createMockOps();
    const plugin = new GitHubPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'github',
        action: 'release',
        data: { tag: 'v1.0.0', id: 10, owner: 'org', repo: 'repo' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('GITHUB_TOKEN not found'));
    expect(ops.calls).toHaveLength(0);
  });

  it('should warn on delete failure and continue', async () => {
    const ops = createMockOps();
    ops.deleteRelease = async () => {
      throw new Error('Not found');
    };
    const plugin = new GitHubPlugin({ token: 'tok', owner: 'org', repo: 'repo' }, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'github',
        action: 'release',
        data: { tag: 'v1.0.0', id: 10, owner: 'org', repo: 'repo' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Not found'));
  });

  it('should skip when no github actions', async () => {
    const ops = createMockOps();
    const plugin = new GitHubPlugin({ token: 'tok', owner: 'org', repo: 'repo' }, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([]);

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
  });
});

describe('GitHubPlugin rollback edge cases', () => {
  it('should silently skip when no token and no github actions', async () => {
    delete process.env.GITHUB_TOKEN;
    const ops = createMockOps();
    const plugin = new GitHubPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([]);

    await rollbackFn(ctx);
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  it('should handle non-Error throws in rollback', async () => {
    const ops = createMockOps();
    ops.deleteRelease = async () => {
      throw 'string error';
    };
    const plugin = new GitHubPlugin({ token: 'tok', owner: 'org', repo: 'repo' }, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'github',
        action: 'release',
        data: { tag: 'v1.0.0', id: 10, owner: 'org', repo: 'repo' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('string error'));
  });
});

describe('GitHubPlugin rollback unknown action', () => {
  it('should skip non-release actions', async () => {
    const ops = createMockOps();
    const plugin = new GitHubPlugin({ token: 'tok', owner: 'org', repo: 'repo' }, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        makeRelease: { tapPromise: vi.fn() },
        createPR: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      { plugin: 'github', action: 'unknown', data: {}, timestamp: '', status: 'completed' },
    ]);

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
  });
});
