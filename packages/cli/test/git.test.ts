import { describe, expect, it, vi } from 'vitest';

import { getCommitsSinceLastTag, parseGitLog } from '../src/utils/git.js';

vi.mock('execa');

describe('git utils', () => {
  describe('parseGitLog', () => {
    it('should parse commits with files', () => {
      const output = `abc123|feat: add feature|John Doe|2024-01-01T00:00:00Z
src/index.ts
src/utils.ts

def456|fix: resolve bug|Jane Doe|2024-01-02T00:00:00Z
src/bug.ts`;

      const commits = parseGitLog(output);

      expect(commits).toHaveLength(2);
      expect(commits[0]).toMatchObject({
        hash: 'abc123',
        message: 'feat: add feature',
        author: 'John Doe',
        files: ['src/index.ts', 'src/utils.ts'],
      });
      expect(commits[1]).toMatchObject({
        hash: 'def456',
        message: 'fix: resolve bug',
        author: 'Jane Doe',
        files: ['src/bug.ts'],
      });
    });

    it('should handle empty blocks', () => {
      const output = `abc123|feat: add feature|John Doe|2024-01-01T00:00:00Z
src/index.ts


def456|fix: resolve bug|Jane Doe|2024-01-02T00:00:00Z
src/bug.ts`;

      const commits = parseGitLog(output);

      expect(commits).toHaveLength(2);
    });

    it('should handle commits without files', () => {
      const output = `abc123|feat: add feature|John Doe|2024-01-01T00:00:00Z`;

      const commits = parseGitLog(output);

      expect(commits).toHaveLength(1);
      expect(commits[0].files).toEqual([]);
    });

    it('should skip completely empty blocks', () => {
      const output = `


abc123|feat: add feature|John Doe|2024-01-01T00:00:00Z
src/index.ts`;

      const commits = parseGitLog(output);

      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('abc123');
    });
  });

  describe('getCommitsSinceLastTag', () => {
    it('should get commits since last tag', async () => {
      const { execa } = await import('execa');

      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: 'v1.0.0' } as never)
        .mockResolvedValueOnce({
          stdout: `abc123|feat: add feature|John Doe|2024-01-01T00:00:00Z
src/index.ts`,
        } as never);

      const commits = await getCommitsSinceLastTag('/test');

      expect(commits).toHaveLength(1);
      expect(execa).toHaveBeenCalledWith('git', ['describe', '--tags', '--abbrev=0'], {
        cwd: '/test',
      });
      expect(execa).toHaveBeenCalledWith(
        'git',
        ['log', 'v1.0.0..HEAD', '--pretty=format:%H|%s|%an|%aI', '--name-only'],
        { cwd: '/test' },
      );
    });

    it('should handle no tags scenario', async () => {
      const { execa } = await import('execa');

      vi.mocked(execa)
        .mockRejectedValueOnce(new Error('No tags'))
        .mockResolvedValueOnce({
          stdout: `abc123|feat: add feature|John Doe|2024-01-01T00:00:00Z
src/index.ts`,
        } as never);

      const commits = await getCommitsSinceLastTag('/test');

      expect(commits).toHaveLength(1);
      expect(execa).toHaveBeenCalledWith(
        'git',
        ['log', '--pretty=format:%H|%s|%an|%aI', '--name-only'],
        {
          cwd: '/test',
        },
      );
    });
  });
});
