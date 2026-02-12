import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitOperations } from '../../plugin-git/src/operations.js';
import { statusCommand } from '../src/commands/status.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

const { mockExeca } = vi.hoisted(() => ({
  mockExeca: vi.fn().mockResolvedValue({ stdout: '' }),
}));
vi.mock('execa', () => ({ execa: mockExeca }));

const { mockGetCommitsSinceTag } = vi.hoisted(() => ({
  mockGetCommitsSinceTag: vi.fn().mockResolvedValue([]),
}));

vi.mock('@bonvoy/plugin-git', () => ({
  default: vi.fn().mockImplementation(() => ({ name: 'git', apply: vi.fn() })),
  defaultGitOperations: {
    getLastTag: vi.fn().mockResolvedValue(null),
    getCommitsSinceTag: mockGetCommitsSinceTag,
  } satisfies Partial<GitOperations>,
}));

describe('statusCommand', () => {
  let cwdSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vol.reset();
    vi.restoreAllMocks();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should show no pending changes', async () => {
    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('✅ No pending changes');
  });

  it('should show changed packages', async () => {
    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    vi.mocked(mockGetCommitsSinceTag).mockResolvedValueOnce([
      {
        hash: 'abc123',
        message: 'feat: new feature',
        author: 'Test',
        date: '2024-01-01T00:00:00Z',
        files: ['src/index.ts'],
      },
      {
        hash: 'def456',
        message: 'fix: bug fix',
        author: 'Test',
        date: '2024-01-02T00:00:00Z',
        files: ['src/index.ts'],
      },
    ]);

    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('📦 1 package(s) with pending changes:\n');
    expect(logSpy).toHaveBeenCalledWith('  test-pkg: 1.0.0 → 1.1.0 (minor, 2 commits)');
    expect(logSpy).toHaveBeenCalledWith('\n📝 2 commit(s) since last release');
    expect(logSpy).toHaveBeenCalledWith('📊 1 total package(s) in workspace');
  });

  it('should handle errors gracefully', async () => {
    vol.fromJSON({}, '/');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    cwdSpy.mockReturnValue('/nonexistent');

    await statusCommand({ silent: true });

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('should show singular commit text for single commit', async () => {
    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    vi.mocked(mockGetCommitsSinceTag).mockResolvedValueOnce([
      {
        hash: 'abc123',
        message: 'feat: new feature',
        author: 'Test',
        date: '2024-01-01T00:00:00Z',
        files: ['src/index.ts'],
      },
    ]);

    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('  test-pkg: 1.0.0 → 1.1.0 (minor, 1 commit)');
  });

  describe('--all flag', () => {
    it('should show all packages with versions when no changes', async () => {
      vol.fromJSON(
        { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
        '/',
      );

      await statusCommand({ all: true });

      expect(logSpy).toHaveBeenCalledWith('📊 1 package(s) in workspace:\n');
      expect(logSpy).toHaveBeenCalledWith('  test-pkg: 1.0.0');
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('commit(s) since'));
    });

    it('should show changed packages with bump and unchanged without', async () => {
      vol.fromJSON(
        {
          '/test/package.json': JSON.stringify({
            name: 'test-monorepo',
            version: '1.0.0',
            private: true,
            workspaces: ['packages/*'],
          }),
          '/test/packages/core/package.json': JSON.stringify({
            name: '@test/core',
            version: '1.0.0',
          }),
          '/test/packages/utils/package.json': JSON.stringify({
            name: '@test/utils',
            version: '0.5.0',
          }),
        },
        '/',
      );

      mockExeca.mockResolvedValueOnce({
        stdout: JSON.stringify([
          { name: '@test/core', version: '1.0.0', location: 'packages/core', private: false },
          { name: '@test/utils', version: '0.5.0', location: 'packages/utils', private: false },
        ]),
      });

      vi.mocked(mockGetCommitsSinceTag).mockResolvedValueOnce([
        {
          hash: 'abc123',
          message: 'feat: new feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ]);

      await statusCommand({ all: true });

      expect(logSpy).toHaveBeenCalledWith('📊 2 package(s) in workspace:\n');
      expect(logSpy).toHaveBeenCalledWith('  @test/core: 1.0.0 → 1.1.0 (minor)');
      expect(logSpy).toHaveBeenCalledWith('  @test/utils: 0.5.0');
      expect(logSpy).toHaveBeenCalledWith('\n📝 1 commit(s) since last release');
    });
  });
});
