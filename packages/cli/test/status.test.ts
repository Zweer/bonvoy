import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitOperations } from '../../plugin-git/src/operations.js';
import { statusCommand } from '../src/commands/status.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '' }),
}));

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
  beforeEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should show no pending changes', async () => {
    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await statusCommand();

    expect(consoleSpy).toHaveBeenCalledWith('✅ No pending changes');

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
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

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await statusCommand();

    expect(consoleSpy).toHaveBeenCalledWith('📦 1 package(s) with pending changes:\n');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test-pkg: 1.0.0 → 1.1.0 (minor, 2 commits)'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('2 commit(s) since last release'),
    );

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    vol.fromJSON({}, '/');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent');

    await statusCommand();

    expect(errorSpy).toHaveBeenCalledWith('❌ Error:', expect.any(String));
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
    cwdSpy.mockRestore();
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

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await statusCommand();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 commit)'));

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
  });
});
