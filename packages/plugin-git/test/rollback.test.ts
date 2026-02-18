import type { RollbackContext } from '@bonvoy/core';
import { describe, expect, it, vi } from 'vitest';

import GitPlugin from '../src/git.js';
import type { GitOperations } from '../src/operations.js';

function createMockOps(): GitOperations & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    async add() {},
    async resetFile() {},
    async commit() {},
    async tag() {},
    async push() {},
    async pushTags() {},
    async checkout() {},
    async getCurrentBranch() {
      return 'main';
    },
    async tagExists() {
      return false;
    },
    async getLastTag() {
      return null;
    },
    async getCommitsSinceTag() {
      return [];
    },
    async getHeadSha() {
      return 'abc123';
    },
    async resetHard(sha, cwd) {
      calls.push({ method: 'resetHard', args: [sha, cwd] });
    },
    async deleteTag(name, cwd) {
      calls.push({ method: 'deleteTag', args: [name, cwd] });
    },
    async deleteRemoteTags(tags, cwd) {
      calls.push({ method: 'deleteRemoteTags', args: [tags, cwd] });
    },
    async forcePush(cwd, branch) {
      calls.push({ method: 'forcePush', args: [cwd, branch] });
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

describe('GitPlugin rollback', () => {
  it('should rollback all git actions in reverse order', async () => {
    const ops = createMockOps();
    const plugin = new GitPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'git',
        action: 'commit',
        data: { previousSha: 'abc123' },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'git',
        action: 'tag',
        data: { tags: ['v1.0.0', 'v2.0.0'] },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'git',
        action: 'push',
        data: { branch: 'main' },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'git',
        action: 'pushTags',
        data: { tags: ['v1.0.0', 'v2.0.0'] },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    const methods = ops.calls.map((c) => c.method);
    // Reverse order: pushTags → push → tag → commit
    expect(methods[0]).toBe('deleteRemoteTags');
    expect(methods[1]).toBe('forcePush');
    expect(methods[2]).toBe('deleteTag');
    expect(methods[3]).toBe('deleteTag');
    expect(methods[4]).toBe('resetHard');
  });

  it('should skip non-git actions', async () => {
    const ops = createMockOps();
    const plugin = new GitPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      { plugin: 'npm', action: 'publish', data: {}, timestamp: '', status: 'completed' },
    ]);

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
  });

  it('should warn on rollback failure and continue', async () => {
    const ops = createMockOps();
    ops.deleteTag = async () => {
      throw new Error('tag not found');
    };
    ops.resetHard = async (sha, cwd) => {
      ops.calls.push({ method: 'resetHard', args: [sha, cwd] });
    };

    const plugin = new GitPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'git',
        action: 'commit',
        data: { previousSha: 'abc' },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'git',
        action: 'tag',
        data: { tags: ['v1.0.0'] },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    // Should have warned about tag failure but still reset
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('tag not found'));
    expect(ops.calls.some((c) => c.method === 'resetHard')).toBe(true);
  });
});

describe('GitPlugin rollback non-Error handling', () => {
  it('should handle non-Error throws in rollback', async () => {
    const ops = createMockOps();
    ops.deleteTag = async () => {
      throw 'string error';
    };

    const plugin = new GitPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'git',
        action: 'tag',
        data: { tags: ['v1.0.0'] },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('string error'));
  });

  it('should skip git rollback when npmFailed is set', async () => {
    const ops = createMockOps();
    const plugin = new GitPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'git',
        action: 'commit',
        data: { previousSha: 'abc123' },
        timestamp: '',
        status: 'completed',
      },
    ]);
    ctx.npmFailed = true;

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping git rollback'));
  });
});

describe('GitPlugin rollback unknown action', () => {
  it('should silently skip unknown action types', async () => {
    const ops = createMockOps();
    const plugin = new GitPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      { plugin: 'git', action: 'unknown-action', data: {}, timestamp: '', status: 'completed' },
    ]);

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
  });
});
