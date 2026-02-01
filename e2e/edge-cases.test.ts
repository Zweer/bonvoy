import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../packages/cli/src/commands/shipit.js';
import ChangelogPlugin from '../packages/plugin-changelog/src/changelog.js';
import ConventionalPlugin from '../packages/plugin-conventional/src/conventional.js';
import GitPlugin from '../packages/plugin-git/src/git.js';
import { createMockGitOperations } from './mock-operations.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('E2E: Edge Cases', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should detect BREAKING CHANGE in commit body', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        {
          hash: 'abc123',
          message: 'feat: new API\n\nBREAKING CHANGE: Old API removed',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['src/api.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('2.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should return no changes when no commits since last tag', async () => {
    const gitOps = createMockGitOperations({
      commits: [], // No commits since tag
      lastTag: 'test-pkg@1.0.0',
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.changedPackages).toHaveLength(0);
  });

  it('should handle mixed semantic and non-semantic commits', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        {
          hash: 'abc1',
          message: 'feat: new feature',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['src/feature.ts'],
        },
        {
          hash: 'abc2',
          message: 'chore: update deps',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['package.json'],
        },
        {
          hash: 'abc3',
          message: 'style: format code',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['src/index.ts'],
        },
        {
          hash: 'abc4',
          message: 'fix: bug fix',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['src/bug.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // Minor from feat (highest), chore and style don't trigger release
    expect(result.versions['test-pkg']).toBe('1.1.0');
    expect(result.bumps['test-pkg']).toBe('minor');
  });

  it('should handle perf commits as patch bump', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        {
          hash: 'abc123',
          message: 'perf: optimize queries',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['src/db.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '1.5.2' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.5.3');
    expect(result.bumps['test-pkg']).toBe('patch');
  });

  it('should handle pre-1.0 breaking change graduating to 1.0', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        {
          hash: 'abc123',
          message: 'feat!: breaking change',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['src/api.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({ name: 'test-pkg', version: '0.5.0' }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    expect(result.versions['test-pkg']).toBe('1.0.0');
    expect(result.bumps['test-pkg']).toBe('major');
  });

  it('should release only selected packages when filtered', async () => {
    const gitOps = createMockGitOperations({
      commits: [
        {
          hash: 'abc1',
          message: 'feat: feature in core',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['packages/core/src/index.ts'],
        },
        {
          hash: 'abc2',
          message: 'feat: feature in utils',
          author: 'Test',
          date: new Date().toISOString(),
          files: ['packages/utils/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({
          name: 'monorepo',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/project/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/project/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
      },
      '/',
    );

    // Only pass @test/core as package - simulates --package filter
    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      packages: [{ name: '@test/core', version: '1.0.0', path: '/project/packages/core' }],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // Only core should be released
    expect(result.changedPackages).toHaveLength(1);
    expect(result.changedPackages[0].name).toBe('@test/core');
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/utils']).toBeUndefined();
  });

  it('should assign commits by file path not by scope in message', async () => {
    // Scope in commit message is informational only
    // Assignment is based on actual files modified
    const gitOps = createMockGitOperations({
      commits: [
        {
          hash: 'abc1',
          message: 'feat(core): add API', // scope says "core"
          author: 'Test',
          date: new Date().toISOString(),
          files: ['packages/utils/src/api.ts'], // but file is in utils!
        },
        {
          hash: 'abc2',
          message: 'fix(utils): resolve bug', // scope says "utils"
          author: 'Test',
          date: new Date().toISOString(),
          files: ['packages/core/src/bug.ts'], // but file is in core!
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/project/package.json': JSON.stringify({
          name: 'monorepo',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/project/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/project/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const result = await shipit(undefined, {
      cwd: '/project',
      dryRun: true,
      gitOps,
      packages: [
        { name: '@test/core', version: '1.0.0', path: '/project/packages/core' },
        { name: '@test/utils', version: '1.0.0', path: '/project/packages/utils' },
      ],
      plugins: [new ConventionalPlugin(), new ChangelogPlugin(), new GitPlugin({}, gitOps)],
    });

    // Assignment is by file path, not by scope
    // utils gets minor (feat), core gets patch (fix)
    expect(result.versions['@test/utils']).toBe('1.1.0'); // feat from "feat(core)" commit
    expect(result.bumps['@test/utils']).toBe('minor');
    expect(result.versions['@test/core']).toBe('1.0.1'); // fix from "fix(utils)" commit
    expect(result.bumps['@test/core']).toBe('patch');
  });
});
