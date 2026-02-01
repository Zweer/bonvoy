import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    async getLastTag() {
      return config.lastTag ?? null;
    },
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
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/test');

    vol.fromJSON(
      {
        '/test/package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      },
      '/',
    );

    await prepareCommand({ dryRun: true });

    expect(consoleSpy).toHaveBeenCalledWith('No packages to release');

    consoleSpy.mockRestore();
    cwdSpy.mockRestore();
  });

  it('should handle prepareCommand errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/nonexistent');

    vol.fromJSON({}, '/');

    await prepareCommand({ dryRun: true });

    expect(errorSpy).toHaveBeenCalledWith('Error:', expect.any(String));
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
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
      async getLastTag() {
        return null;
      },
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
    expect(calls.some((c) => c.startsWith('commit:chore(release): prepare'))).toBe(true);
    expect(calls.some((c) => c.startsWith('push:release/'))).toBe(true);

    // Check that package.json was updated
    const pkgJson = JSON.parse(vol.readFileSync('/test/package.json', 'utf-8') as string);
    expect(pkgJson.version).toBe('1.1.0');
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
});
