import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitOperations } from '../../plugin-git/src/operations.js';
import { analyzeStatus } from '../src/utils/analyze.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '' }),
}));

function createMockGitOps(config: {
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
      return 'main';
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

describe('analyzeStatus', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should detect changed packages', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: new feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
    });

    const result = await analyzeStatus({ cwd: '/test', gitOps });

    expect(result.packages).toHaveLength(1);
    expect(result.changedPackages).toHaveLength(1);
    expect(result.changedPackages[0].bump).toBe('minor');
    expect(result.changedPackages[0].pkg.name).toBe('test-pkg');
  });

  it('should return empty when no changes', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'chore: update deps',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['package.json'],
        },
      ],
    });

    const result = await analyzeStatus({ cwd: '/test', gitOps });

    expect(result.changedPackages).toHaveLength(0);
  });
});
