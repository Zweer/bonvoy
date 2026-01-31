import { describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';

import { defaultNpmOperations } from '../src/operations.js';

const mockExeca = vi.mocked(execa);

describe('defaultNpmOperations', () => {
  it('publish calls npm publish', async () => {
    await defaultNpmOperations.publish(['--access', 'public'], '/project');
    expect(mockExeca).toHaveBeenCalledWith('npm', ['publish', '--access', 'public'], {
      cwd: '/project',
      stdio: 'inherit',
    });
  });

  it('view returns version', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '1.0.0\n' } as any);
    const result = await defaultNpmOperations.view('@test/pkg', '1.0.0');
    expect(result).toBe('1.0.0');
    expect(mockExeca).toHaveBeenCalledWith('npm', ['view', '@test/pkg@1.0.0', 'version'], {
      stdio: 'pipe',
    });
  });

  it('view returns null on empty', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '' } as any);
    const result = await defaultNpmOperations.view('@test/pkg', '1.0.0');
    expect(result).toBeNull();
  });

  it('view returns null on error', async () => {
    mockExeca.mockRejectedValueOnce(new Error('not found'));
    const result = await defaultNpmOperations.view('@test/pkg', '1.0.0');
    expect(result).toBeNull();
  });
});
