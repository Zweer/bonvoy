import type { RollbackContext } from '@bonvoy/core';
import { describe, expect, it, vi } from 'vitest';

import NpmPlugin from '../src/npm.js';
import type { NpmOperations } from '../src/operations.js';

function createMockOps(): NpmOperations & { calls: Array<{ method: string; args: unknown[] }> } {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  return {
    calls,
    async publish() {
      return '';
    },
    async view() {
      return null;
    },
    async packageExists() {
      return true;
    },
    async hasToken() {
      return true;
    },
    async unpublish(pkg, version) {
      calls.push({ method: 'unpublish', args: [pkg, version] });
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

describe('NpmPlugin rollback', () => {
  it('should unpublish packages in reverse order', async () => {
    const ops = createMockOps();
    const plugin = new NpmPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        publish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'npm',
        action: 'publish',
        data: { name: 'pkg-a', version: '1.1.0' },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'npm',
        action: 'publish',
        data: { name: 'pkg-b', version: '2.0.0' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ops.calls).toHaveLength(2);
    expect(ops.calls[0].args).toEqual(['pkg-b', '2.0.0']);
    expect(ops.calls[1].args).toEqual(['pkg-a', '1.1.0']);
    expect(ctx.npmFailed).toBeUndefined();
  });

  it('should set npmFailed and stop on unpublish failure', async () => {
    const ops = createMockOps();
    ops.unpublish = async () => {
      throw new Error('Cannot unpublish');
    };

    const plugin = new NpmPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        publish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'npm',
        action: 'publish',
        data: { name: 'pkg-a', version: '1.0.0' },
        timestamp: '',
        status: 'completed',
      },
      {
        plugin: 'npm',
        action: 'publish',
        data: { name: 'pkg-b', version: '2.0.0' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);

    expect(ctx.npmFailed).toBe(true);
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining('Cannot unpublish'));
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining('Skipping git rollback'));
  });

  it('should skip non-npm actions', async () => {
    const ops = createMockOps();
    const plugin = new NpmPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        publish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      { plugin: 'git', action: 'commit', data: {}, timestamp: '', status: 'completed' },
      { plugin: 'npm', action: 'unknown', data: {}, timestamp: '', status: 'completed' },
    ]);

    await rollbackFn(ctx);
    expect(ops.calls).toHaveLength(0);
  });
});

describe('NpmPlugin rollback edge cases', () => {
  it('should handle non-Error throws in rollback', async () => {
    const ops = createMockOps();
    ops.unpublish = async () => {
      throw 'string error';
    };

    const plugin = new NpmPlugin({}, ops);
    const bonvoy = {
      hooks: {
        validateRepo: { tapPromise: vi.fn() },
        publish: { tapPromise: vi.fn() },
        rollback: { tapPromise: vi.fn() },
      },
    };
    plugin.apply(bonvoy);

    const rollbackFn = bonvoy.hooks.rollback.tapPromise.mock.calls[0][1];
    const ctx = createRollbackContext([
      {
        plugin: 'npm',
        action: 'publish',
        data: { name: 'pkg', version: '1.0.0' },
        timestamp: '',
        status: 'completed',
      },
    ]);

    await rollbackFn(ctx);
    expect(ctx.npmFailed).toBe(true);
    expect(ctx.logger.error).toHaveBeenCalledWith(expect.stringContaining('string error'));
  });
});
