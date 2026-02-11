import { describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';

import { defaultNpmOperations } from '../src/operations.js';

const mockExeca = vi.mocked(execa);

describe('defaultNpmOperations', () => {
  it('publish calls npm publish and returns output', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '+ @test/pkg@1.0.0', stderr: '' } as any);
    const output = await defaultNpmOperations.publish(['--access', 'public'], '/project');
    expect(output).toBe('+ @test/pkg@1.0.0');
    expect(mockExeca).toHaveBeenCalledWith('npm', ['publish', '--access', 'public'], {
      cwd: '/project',
      stdio: 'pipe',
    });
  });

  it('publish includes stderr when present', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '+ @test/pkg@1.0.0', stderr: 'npm notice' } as any);
    const output = await defaultNpmOperations.publish([], '/project');
    expect(output).toBe('+ @test/pkg@1.0.0\nnpm notice');
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
