import type { RollbackContext } from '@bonvoy/core';
import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GitLabPlugin from '../src/gitlab.js';
import type { GitLabOperations } from '../src/operations.js';

vi.mock('node:fs');

function createMockOps(): GitLabOperations & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    async createRelease() {},
    async createMR() {
      return { url: '', iid: 0 };
    },
    async releaseExists() {
      return false;
    },
    async deleteRelease(_token, host, projectId, tagName) {
      calls.push({ method: 'deleteRelease', args: [host, projectId, tagName] });
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
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    actionLog: { record: vi.fn(), entries: () => [] },
    actions,
    errors: [],
  };
}

describe('GitLabPlugin rollback', () => {
  beforeEach(() => {
    vol.reset();
    process.env.GITLAB_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GITLAB_TOKEN;
  });

  it('should delete releases', async () => {
    const ops = createMockOps();
    const plugin = new GitLabPlugin({ token: 'tok', projectId: '123' }, ops);
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
        plugin: 'gitlab',
        action: 'release',
        data: { tag: 'v1.0.0', projectId: '123', host: 'https://gitlab.com' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ops.calls).toHaveLength(1);
    expect(ops.calls[0].args).toEqual(['https://gitlab.com', '123', 'v1.0.0']);
  });

  it('should warn when GITLAB_TOKEN is missing', async () => {
    delete process.env.GITLAB_TOKEN;
    const ops = createMockOps();
    const plugin = new GitLabPlugin({}, ops);
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
        plugin: 'gitlab',
        action: 'release',
        data: { tag: 'v1.0.0', projectId: '123', host: 'https://gitlab.com' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('GITLAB_TOKEN not found'));
  });

  it('should warn on delete failure', async () => {
    const ops = createMockOps();
    ops.deleteRelease = async () => {
      throw new Error('API error');
    };
    const plugin = new GitLabPlugin({ token: 'tok', projectId: '123' }, ops);
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
        plugin: 'gitlab',
        action: 'release',
        data: { tag: 'v1.0.0', projectId: '123', host: 'https://gitlab.com' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('API error'));
  });
});

describe('GitLabPlugin rollback edge cases', () => {
  it('should silently skip when no token and no gitlab actions', async () => {
    delete process.env.GITLAB_TOKEN;
    const ops = createMockOps();
    const plugin = new GitLabPlugin({}, ops);
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
    const plugin = new GitLabPlugin({ token: 'tok', projectId: '123' }, ops);
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
        plugin: 'gitlab',
        action: 'release',
        data: { tag: 'v1.0.0', projectId: '123', host: 'https://gitlab.com' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('string error'));
  });
});

describe('GitLabPlugin rollback unknown action', () => {
  it('should skip non-release actions', async () => {
    process.env.GITLAB_TOKEN = 'test-token';
    const ops = createMockOps();
    const plugin = new GitLabPlugin({ token: 'tok', projectId: '123' }, ops);
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
      { plugin: 'gitlab', action: 'unknown', data: {}, timestamp: '', status: 'completed' },
    ]);

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
    delete process.env.GITLAB_TOKEN;
  });
});
