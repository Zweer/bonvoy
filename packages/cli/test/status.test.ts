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

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await statusCommand({ silent: true });

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

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    // Verify it doesn't throw
    await statusCommand({ silent: true });

    cwdSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    vol.fromJSON({}, '/');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent');

    await statusCommand({ silent: true });

    expect(exitSpy).toHaveBeenCalledWith(1);

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

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    await statusCommand({ silent: true });

    cwdSpy.mockRestore();
  });
});
