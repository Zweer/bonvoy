import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChangelogPlugin from '../../plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../../plugin-conventional/src/conventional.js';
import GitPlugin from '../../plugin-git/src/git.js';
import type { GitOperations } from '../../plugin-git/src/operations.js';
import { shipit } from '../src/commands/shipit.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

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
    async getLastTag() {
      return config.lastTag ?? null;
    },
    async getCommitsSinceTag() {
      return config.commits ?? [];
    },
  };
}

describe('shipit command', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should handle workspace with changes', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.packages).toHaveLength(1);
    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.1.0');
  });

  it('should handle no changes', async () => {
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
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: true,
      cwd: '/test',
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.changedPackages).toHaveLength(0);
  });

  it('should write changelog when not in dry-run', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      gitOps,
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    // Verify version was bumped
    expect(result.versions['test-pkg']).toBe('1.1.0');

    // Verify package.json was updated
    const pkgJson = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(pkgJson.version).toBe('1.1.0');
  });

  it('should throw on invalid version', async () => {
    const gitOps = createMockGitOps({ commits: [], lastTag: null });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await expect(
      shipit('invalid-version', {
        dryRun: true,
        cwd: '/test',
        gitOps,
        plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
      }),
    ).rejects.toThrow('Invalid version "invalid-version"');
  });

  it('should handle invalid package version gracefully', async () => {
    const gitOps = createMockGitOps({ commits: [], lastTag: null });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: 'invalid' }),
      },
      '/',
    );

    const result = await shipit('patch', {
      dryRun: true,
      cwd: '/test',
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // When inc() returns null due to invalid version, it falls back to pkg.version
    expect(result.versions['test-pkg']).toBe('invalid');
  });

  it('should write global changelog when enabled', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: add feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await shipit(undefined, {
      dryRun: false,
      cwd: '/test',
      gitOps,
      config: { changelog: { global: true } },
      plugins: [
        new ConventionalPlugin(),
        new ChangelogPlugin(),
        new GitPlugin({ push: false }, gitOps),
      ],
    });

    expect(vol.existsSync('/test/CHANGELOG.md')).toBe(true);
  });
});
