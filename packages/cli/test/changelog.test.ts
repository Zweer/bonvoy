import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitOperations } from '../../plugin-git/src/operations.js';
import { changelogCommand } from '../src/commands/changelog.js';

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

describe('changelogCommand', () => {
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

    await changelogCommand();

    expect(consoleSpy).toHaveBeenCalledWith('✅ No pending changes - nothing to preview');

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should preview changelog for changed packages', async () => {
    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    vi.mocked(mockGetCommitsSinceTag).mockResolvedValueOnce([
      {
        hash: 'abc123',
        message: 'feat: awesome feature',
        author: 'Test',
        date: '2024-01-01T00:00:00Z',
        files: ['src/index.ts'],
      },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await changelogCommand();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-pkg'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('awesome feature'));

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    vol.fromJSON({}, '/');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent');

    await changelogCommand();

    expect(errorSpy).toHaveBeenCalledWith('❌ Error:', expect.any(String));
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
    cwdSpy.mockRestore();
  });
});
