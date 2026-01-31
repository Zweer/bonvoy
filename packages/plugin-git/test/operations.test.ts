import { describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';

import { defaultGitOperations } from '../src/operations.js';

const mockExeca = vi.mocked(execa);

describe('defaultGitOperations', () => {
  it('add calls git add', async () => {
    await defaultGitOperations.add('.', '/project');
    expect(mockExeca).toHaveBeenCalledWith('git', ['add', '.'], { cwd: '/project' });
  });

  it('commit calls git commit', async () => {
    await defaultGitOperations.commit('test message', '/project');
    expect(mockExeca).toHaveBeenCalledWith('git', ['commit', '-m', 'test message'], {
      cwd: '/project',
    });
  });

  it('tag calls git tag', async () => {
    await defaultGitOperations.tag('v1.0.0', '/project');
    expect(mockExeca).toHaveBeenCalledWith('git', ['tag', 'v1.0.0'], { cwd: '/project' });
  });

  it('push calls git push', async () => {
    await defaultGitOperations.push('/project');
    expect(mockExeca).toHaveBeenCalledWith('git', ['push'], { cwd: '/project' });
  });

  it('pushTags calls git push with tags', async () => {
    await defaultGitOperations.pushTags(['v1.0.0', 'v2.0.0'], '/project');
    expect(mockExeca).toHaveBeenCalledWith('git', ['push', 'origin', 'v1.0.0', 'v2.0.0'], {
      cwd: '/project',
    });
  });

  it('getLastTag returns tag', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: 'v1.0.0\n' } as any);
    const result = await defaultGitOperations.getLastTag('/project');
    expect(result).toBe('v1.0.0');
  });

  it('getLastTag returns null on empty', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '' } as any);
    const result = await defaultGitOperations.getLastTag('/project');
    expect(result).toBeNull();
  });

  it('getLastTag returns null on error', async () => {
    mockExeca.mockRejectedValueOnce(new Error('no tags'));
    const result = await defaultGitOperations.getLastTag('/project');
    expect(result).toBeNull();
  });

  it('getCommitsSinceTag parses commits', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: 'abc123|feat: add feature|John|2024-01-01\nfile1.ts\nfile2.ts',
      // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    } as any);
    const result = await defaultGitOperations.getCommitsSinceTag('v1.0.0', '/project');
    expect(result).toEqual([
      {
        hash: 'abc123',
        message: 'feat: add feature',
        author: 'John',
        date: '2024-01-01',
        files: ['file1.ts', 'file2.ts'],
      },
    ]);
  });

  it('getCommitsSinceTag with null tag uses HEAD', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '' } as any);
    await defaultGitOperations.getCommitsSinceTag(null, '/project');
    expect(mockExeca).toHaveBeenCalledWith(
      'git',
      ['log', '--pretty=format:%H|%s|%an|%aI', '--name-only', 'HEAD'],
      { cwd: '/project' },
    );
  });

  it('getCommitsSinceTag returns empty on empty output', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '  ' } as any);
    const result = await defaultGitOperations.getCommitsSinceTag('v1.0.0', '/project');
    expect(result).toEqual([]);
  });

  it('getCommitsSinceTag handles multiple commits', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: 'abc|feat: one|A|2024-01-01\nf1.ts\n\ndef|fix: two|B|2024-01-02\nf2.ts',
      // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    } as any);
    const result = await defaultGitOperations.getCommitsSinceTag('v1.0.0', '/project');
    expect(result).toHaveLength(2);
  });

  it('getCommitsSinceTag skips invalid entries', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: '|\n\nabc|msg|A|D\nf.ts' } as any);
    const result = await defaultGitOperations.getCommitsSinceTag('v1.0.0', '/project');
    expect(result).toHaveLength(1);
  });

  it('getCommitsSinceTag handles missing author/date', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Mock return type
    mockExeca.mockResolvedValueOnce({ stdout: 'abc|msg||\nf.ts' } as any);
    const result = await defaultGitOperations.getCommitsSinceTag('v1.0.0', '/project');
    expect(result[0].author).toBe('');
    expect(result[0].date).toBe('');
  });
});
