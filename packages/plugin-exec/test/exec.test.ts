import { describe, expect, it, vi } from 'vitest';

import ExecPlugin from '../src/exec.js';
import type { ExecOperations } from '../src/operations.js';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  level: 'silent' as const,
};

function createMockOps(): ExecOperations & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async exec(command: string) {
      calls.push(command);
    },
  };
}

describe('ExecPlugin', () => {
  it('should have correct name', () => {
    const plugin = new ExecPlugin();
    expect(plugin.name).toBe('exec');
  });

  it('should execute command on hook', async () => {
    const mockOps = createMockOps();
    const plugin = new ExecPlugin({ beforePublish: 'npm run build' }, mockOps);

    const mockBonvoy = {
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        afterVersion: { tapPromise: vi.fn() },
        beforeChangelog: { tapPromise: vi.fn() },
        afterChangelog: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        afterPublish: { tapPromise: vi.fn() },
        beforeRelease: { tapPromise: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.beforePublish.tapPromise).toHaveBeenCalledWith(
      'exec',
      expect.any(Function),
    );

    const hookFn = mockBonvoy.hooks.beforePublish.tapPromise.mock.calls[0][1];
    await hookFn({ isDryRun: false, rootPath: '/test', logger: mockLogger });

    expect(mockOps.calls).toEqual(['npm run build']);
    expect(mockLogger.info).toHaveBeenCalledWith('🔧 Executing: npm run build');
  });

  it('should skip execution in dry-run mode', async () => {
    const mockOps = createMockOps();
    const plugin = new ExecPlugin({ afterRelease: 'echo done' }, mockOps);

    const mockBonvoy = {
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        afterVersion: { tapPromise: vi.fn() },
        beforeChangelog: { tapPromise: vi.fn() },
        afterChangelog: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        afterPublish: { tapPromise: vi.fn() },
        beforeRelease: { tapPromise: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    const hookFn = mockBonvoy.hooks.afterRelease.tapPromise.mock.calls[0][1];
    await hookFn({ isDryRun: true, rootPath: '/test', logger: mockLogger });

    expect(mockOps.calls).toEqual([]);
  });

  it('should register multiple hooks', async () => {
    const mockOps = createMockOps();
    const plugin = new ExecPlugin(
      {
        beforePublish: 'npm run build',
        afterRelease: 'notify',
      },
      mockOps,
    );

    const mockBonvoy = {
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        afterVersion: { tapPromise: vi.fn() },
        beforeChangelog: { tapPromise: vi.fn() },
        afterChangelog: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        afterPublish: { tapPromise: vi.fn() },
        beforeRelease: { tapPromise: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.beforePublish.tapPromise).toHaveBeenCalled();
    expect(mockBonvoy.hooks.afterRelease.tapPromise).toHaveBeenCalled();
    expect(mockBonvoy.hooks.beforeShipIt.tapPromise).not.toHaveBeenCalled();
  });

  it('should not register hooks without commands', () => {
    const plugin = new ExecPlugin({});

    const mockBonvoy = {
      hooks: {
        beforeShipIt: { tapPromise: vi.fn() },
        afterVersion: { tapPromise: vi.fn() },
        beforeChangelog: { tapPromise: vi.fn() },
        afterChangelog: { tapPromise: vi.fn() },
        beforePublish: { tapPromise: vi.fn() },
        afterPublish: { tapPromise: vi.fn() },
        beforeRelease: { tapPromise: vi.fn() },
        afterRelease: { tapPromise: vi.fn() },
      },
    };

    plugin.apply(mockBonvoy);

    expect(mockBonvoy.hooks.beforePublish.tapPromise).not.toHaveBeenCalled();
    expect(mockBonvoy.hooks.afterRelease.tapPromise).not.toHaveBeenCalled();
  });
});
