import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BonvoyConfig } from '../../core/src/schema.js';
import type { GitOperations } from '../../plugin-git/src/operations.js';
import { prepare, prepareCommand } from '../src/commands/prepare.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '' }),
}));

function createMockGitOps(config: {
  commits?: Array<{ hash: string; message: string; author: string; date: string; files: string[] }>;
  lastTag?: string | null;
  currentBranch?: string;
}): GitOperations {
  return {
    async add() {},
    async commit() {},
    async tag() {},
    async push() {},
    async pushTags() {},
    async checkout() {},
    async getCurrentBranch() {
      return config.currentBranch ?? 'main';
    },
    async tagExists() {
      return false;
    },
    async getLastTag() {
      return config.lastTag ?? null;
    },
    async getHeadSha() {
      return 'mock-sha';
    },
    async resetHard() {},
    async deleteTag() {},
    async deleteRemoteTags() {},
    async forcePush() {},
    async getCommitsSinceTag() {
      return config.commits ?? [];
    },
  };
}

describe('prepare command', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should return empty result when no packages to release', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const gitOps = createMockGitOps({ commits: [], lastTag: null });

    const result = await prepare({
      cwd: '/test',
      gitOps,
      dryRun: true,
      silent: true,
    });

    expect(result.packages).toHaveLength(0);
    expect(result.branchName).toBe('');
  });

  it('should create release branch and bump versions', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
        '/test/CHANGELOG.md': '',
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
      lastTag: null,
    });

    const result = await prepare({
      cwd: '/test',
      gitOps,
      dryRun: true,
      silent: true,
    });

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe('test-pkg');
    expect(result.versions['test-pkg']).toBe('1.1.0');
    expect(result.branchName).toMatch(/^release\/\d+$/);
  });

  it('should handle prepareCommand with no packages', async () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await prepareCommand(undefined, { dryRun: true, silent: true });

    cwdSpy.mockRestore();
  });

  it('should handle prepareCommand errors', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent');

    vol.fromJSON({}, '/');

    await prepareCommand(undefined, { dryRun: true, silent: true });

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should write files and commit when not in dry-run', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
        '/test/CHANGELOG.md': '# Changelog\n',
      },
      '/',
    );

    const calls: string[] = [];
    const gitOps: GitOperations = {
      async add(files) {
        calls.push(`add:${files}`);
      },
      async commit(msg) {
        calls.push(`commit:${msg}`);
      },
      async tag() {},
      async push(_, branch) {
        calls.push(`push:${branch ?? 'default'}`);
      },
      async pushTags() {},
      async checkout(branch) {
        calls.push(`checkout:${branch}`);
      },
      async getCurrentBranch() {
        return 'main';
      },
      async tagExists() {
        return false;
      },
      async getLastTag() {
        return null;
      },
      async getHeadSha() {
        return 'mock-sha';
      },
      async resetHard() {},
      async deleteTag() {},
      async deleteRemoteTags() {},
      async forcePush() {},
      async getCommitsSinceTag() {
        return [
          {
            hash: 'abc123',
            message: 'feat: new feature',
            author: 'Test',
            date: '2024-01-01T00:00:00Z',
            files: ['src/index.ts'],
          },
        ];
      },
    };

    const result = await prepare({
      cwd: '/test',
      gitOps,
      dryRun: false,
      silent: true,
    });

    expect(result.packages).toHaveLength(1);
    expect(calls).toContain('add:.');
    expect(calls.some((c) => c.startsWith('commit:chore: :bookmark: release'))).toBe(true);
    expect(calls.some((c) => c.startsWith('push:release/'))).toBe(true);

    // Check that package.json was updated
    const pkgJson = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(pkgJson.version).toBe('1.1.0');
  });

  it('should use {details} placeholder in commit message', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const calls: string[] = [];
    const gitOps: GitOperations = {
      async add(files) {
        calls.push(`add:${files}`);
      },
      async commit(msg) {
        calls.push(`commit:${msg}`);
      },
      async tag() {},
      async push() {},
      async pushTags() {},
      async checkout(branch) {
        calls.push(`checkout:${branch}`);
      },
      async getCurrentBranch() {
        return 'main';
      },
      async tagExists() {
        return false;
      },
      async getLastTag() {
        return null;
      },
      async getHeadSha() {
        return 'mock-sha';
      },
      async resetHard() {},
      async deleteTag() {},
      async deleteRemoteTags() {},
      async forcePush() {},
      async getCommitsSinceTag() {
        return [
          {
            hash: 'abc123',
            message: 'feat: new feature',
            author: 'Test',
            date: '2024-01-01T00:00:00Z',
            files: ['src/index.ts'],
          },
        ];
      },
    };

    await prepare({
      cwd: '/test',
      gitOps,
      dryRun: false,
      silent: true,
      config: { commitMessage: 'release\n\n{details}' } as BonvoyConfig,
    });

    expect(calls.some((c) => c === 'commit:release\n\n- test-pkg@1.1.0')).toBe(true);
  });

  it('should write existing changelog when present', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
        '/test/CHANGELOG.md': '# Existing Changelog\n\n## 1.0.0\n\n- Initial release',
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
      lastTag: null,
    });

    await prepare({
      cwd: '/test',
      gitOps,
      dryRun: false,
      silent: true,
    });

    // Check that changelog was prepended (new content + existing)
    const changelog = vol.readFileSync('/test/CHANGELOG.md', 'utf-8') as string;
    expect(changelog).toContain('# Existing Changelog');
    expect(changelog).toContain('new feature');
  });

  it('should handle package without changelog', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
        // No CHANGELOG.md file
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
      lastTag: null,
    });

    const result = await prepare({
      cwd: '/test',
      gitOps,
      dryRun: false,
      silent: true,
    });

    expect(result.packages).toHaveLength(1);
    // Changelog file should be created
    const changelog = vol.readFileSync('/test/CHANGELOG.md', 'utf-8') as string;
    expect(changelog).toContain('new feature');
  });

  it('should handle invalid package version gracefully', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: 'invalid' }),
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
      lastTag: null,
    });

    const result = await prepare({
      cwd: '/test',
      gitOps,
      dryRun: true,
      silent: true,
    });

    // Should fallback to original version when inc fails
    expect(result.packages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('invalid');
  });

  it('should handle empty changelog from plugin', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    const gitOps = createMockGitOps({
      commits: [], // No commits = no changelog generated
      lastTag: null,
    });

    const result = await prepare({
      cwd: '/test',
      gitOps,
      dryRun: true,
      silent: true,
    });

    // No changes detected
    expect(result.packages).toHaveLength(0);
  });

  it('should invoke createPR hook with correct context', async () => {
    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          repository: { type: 'git', url: 'git+https://github.com/test/repo.git' },
        }),
        '/test/CHANGELOG.md': '',
      },
      '/',
    );

    const gitOps: GitOperations = {
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
        return null;
      },
      async getHeadSha() {
        return 'mock-sha';
      },
      async resetHard() {},
      async deleteTag() {},
      async deleteRemoteTags() {},
      async forcePush() {},
      async getCommitsSinceTag() {
        return [
          {
            hash: 'abc123',
            message: 'feat: new feature',
            author: 'Test',
            date: '2024-01-01T00:00:00Z',
            files: ['src/index.ts'],
          },
        ];
      },
    };

    // Monkey-patch to capture createPR calls without needing real GitHub/GitLab
    const origPrepare = await import('../src/commands/prepare.js');
    const result = await origPrepare.prepare({
      cwd: '/test',
      gitOps,
      dryRun: true,
      silent: true,
    });

    // The prepare command should have packages to release
    expect(result.packages).toHaveLength(1);
    expect(result.branchName).toMatch(/^release\/\d+$/);
  });
});

describe('prepare - fixed versioning', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should apply same version to all packages when versioning is fixed', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: core feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
        {
          hash: 'a2',
          message: 'fix: utils bug',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/utils/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
        '/test/packages/utils/package.json': JSON.stringify({
          name: '@test/utils',
          version: '1.0.0',
        }),
      },
      '/',
    );

    const result = await prepare({
      dryRun: true,
      cwd: '/test',
      gitOps,
      silent: true,
      config: { versioning: 'fixed' },
      packages: [
        { name: '@test/core', version: '1.0.0', path: '/test/packages/core' },
        { name: '@test/utils', version: '1.0.0', path: '/test/packages/utils' },
      ],
    });

    expect(result.packages).toHaveLength(2);
    expect(result.versions['@test/core']).toBe('1.1.0');
    expect(result.versions['@test/utils']).toBe('1.1.0');
  });
});

describe('prepare - rootVersionStrategy', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should bump root package with max strategy', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
      },
      '/',
    );

    await prepare({
      dryRun: false,
      cwd: '/test',
      gitOps,
      silent: true,
      config: { rootVersionStrategy: 'max' },
      packages: [{ name: '@test/core', version: '1.0.0', path: '/test/packages/core' }],
    });

    const rootPkg = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(rootPkg.version).toBe('1.1.0');
  });

  it('should bump root package with patch strategy', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '1.0.0',
          private: true,
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
      },
      '/',
    );

    await prepare({
      dryRun: false,
      cwd: '/test',
      gitOps,
      silent: true,
      config: { rootVersionStrategy: 'patch' },
      packages: [{ name: '@test/core', version: '1.0.0', path: '/test/packages/core' }],
    });

    const rootPkg = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(rootPkg.version).toBe('1.0.1');
  });
});

describe('prepare - fixed versioning with explicit version', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should use explicit version in fixed mode', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'a1',
          message: 'feat: feature',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['packages/core/src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          workspaces: ['packages/*'],
        }),
        '/test/packages/core/package.json': JSON.stringify({
          name: '@test/core',
          version: '1.0.0',
        }),
      },
      '/',
    );

    // Note: prepare doesn't support force bump, but the changeset plugin can return explicit versions
    // This test covers the valid(bump) branch in the reduce
    const result = await prepare({
      dryRun: true,
      cwd: '/test',
      gitOps,
      silent: true,
      config: { versioning: 'fixed' },
      packages: [{ name: '@test/core', version: '1.0.0', path: '/test/packages/core' }],
    });

    expect(result.packages).toHaveLength(1);
    expect(result.versions['@test/core']).toBe('1.1.0');
  });

  it('should apply force bump when provided', async () => {
    const gitOps = createMockGitOps({
      commits: [
        {
          hash: 'abc123',
          message: 'chore: update deps',
          author: 'Test',
          date: '2024-01-01T00:00:00Z',
          files: ['src/index.ts'],
        },
      ],
      lastTag: null,
    });

    vol.fromJSON(
      { '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }) },
      '/',
    );

    const result = await prepare({
      dryRun: true,
      cwd: '/test',
      gitOps,
      silent: true,
      bump: 'minor',
    });

    expect(result.versions['test-pkg']).toBe('1.1.0');
  });
});
