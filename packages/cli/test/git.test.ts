import type { GitOperations } from '@bonvoy/plugin-git';
import { describe, expect, it } from 'vitest';

import { getCommitsSinceLastTag } from '../src/utils/git.js';

function createMockOps(config: {
  commits?: Array<{ hash: string; message: string; author: string; date: string; files: string[] }>;
  lastTag?: string | null;
}): GitOperations {
  return {
    async add() {},
    async commit() {},
    async tag() {},
    async push() {},
    async pushTags() {},
    async checkout() {},
    async getCurrentBranch() {
      return 'feature-branch';
    },
    async tagExists() {
      return false;
    },
    async getLastTag() {
      return config.lastTag ?? null;
    },
    async getCommitsSinceTag() {
      return config.commits ?? [];
    },
  };
}

describe('git utils', () => {
  describe('getCommitsSinceLastTag', () => {
    it('should return commits from operations', async () => {
      const mockOps = createMockOps({
        commits: [
          {
            hash: 'abc123',
            message: 'feat: add feature',
            author: 'John',
            date: '2024-01-01T00:00:00Z',
            files: ['src/index.ts'],
          },
        ],
        lastTag: 'v1.0.0',
      });

      const commits = await getCommitsSinceLastTag('/test', mockOps);

      expect(commits).toHaveLength(1);
      expect(commits[0].hash).toBe('abc123');
      expect(commits[0].message).toBe('feat: add feature');
      expect(commits[0].files).toEqual(['src/index.ts']);
    });

    it('should handle no commits', async () => {
      const mockOps = createMockOps({ commits: [], lastTag: null });

      const commits = await getCommitsSinceLastTag('/test', mockOps);

      expect(commits).toHaveLength(0);
    });

    it('should convert date string to Date object', async () => {
      const mockOps = createMockOps({
        commits: [
          {
            hash: 'abc123',
            message: 'feat: test',
            author: 'Test',
            date: '2024-06-15T10:30:00Z',
            files: [],
          },
        ],
      });

      const commits = await getCommitsSinceLastTag('/test', mockOps);

      expect(commits[0].date).toBeInstanceOf(Date);
      expect(commits[0].date.toISOString()).toBe('2024-06-15T10:30:00.000Z');
    });
  });
});
