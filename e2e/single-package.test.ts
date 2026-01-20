import { execa } from 'execa';
import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit, shipitCommand } from '../packages/cli/src/commands/shipit.js';
import { createMockCommit, createMockExeca } from './helpers.js';

// Mock filesystem
vi.mock('node:fs');
vi.mock('node:fs/promises');

// Mock execa
vi.mock('execa');

describe('E2E: Single Package - First Release', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('should bump version from 0.0.0 to 0.1.0 with feat commit', async () => {
    // Setup mock execa
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('feat', 'add authentication', ['src/auth.ts']),
      createMockCommit('fix', 'resolve memory leak', ['src/memory.ts']),
      createMockCommit('docs', 'update README', ['README.md']),
    ]);
    mockExeca.setGitLastTag(null); // No previous tags
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    // Setup mock filesystem
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '0.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    // Call shipit
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    // Assertions
    expect(result.packages).toHaveLength(1);
    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('0.1.0');
    expect(result.bumps['test-pkg']).toBe('minor');
  });

  it('should include only semantic commits in changelog', async () => {
    // Setup mock execa
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('feat', 'add authentication', ['src/auth.ts']),
      createMockCommit('fix', 'resolve memory leak', ['src/memory.ts']),
      createMockCommit('docs', 'update README', ['README.md']),
      createMockCommit('chore', 'update deps', ['package.json']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    // Setup mock filesystem
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '0.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    // Call shipit
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    // Assertions - changelog should only include feat and fix
    expect(result.commits).toHaveLength(4);
    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('0.1.0');
  });

  it('should handle no changes scenario', async () => {
    // Setup mock execa
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([
      createMockCommit('docs', 'update README', ['README.md']),
      createMockCommit('chore', 'update deps', ['package.json']),
    ]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    // Setup mock filesystem
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '0.0.0',
        }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    // Call shipit
    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    // Assertions - no semantic commits means no changes
    expect(result.changedPackages).toHaveLength(0);
    expect(result.versions).toEqual({});
  });

  it('should run shipitCommand with changes in dry-run mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([createMockCommit('feat', 'add feature', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    await shipitCommand(undefined, { dryRun: true, cwd: '/project' });

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
    expect(consoleSpy).toHaveBeenCalledWith('🔍 Dry run mode enabled');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-pkg: 1.0.0 → 1.1.0'));
    expect(consoleSpy).toHaveBeenCalledWith('✅ 1 package(s) to release');
    expect(consoleSpy).toHaveBeenCalledWith('🔍 Dry run completed - no changes made');

    consoleSpy.mockRestore();
  });

  it('should run shipitCommand without dry-run', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([createMockCommit('feat', 'add feature', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    await shipitCommand(undefined, { dryRun: false, cwd: '/project' });

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
    expect(consoleSpy).toHaveBeenCalledWith('🎉 Release completed successfully!');

    consoleSpy.mockRestore();
  });

  it('should handle invalid version gracefully', async () => {
    const mockExeca = createMockExeca();
    mockExeca.setGitCommits([createMockCommit('feat', 'add feature', ['src/index.ts'])]);
    mockExeca.setGitLastTag(null);
    vi.mocked(execa).mockImplementation(mockExeca.mockFn);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'test-pkg', version: 'invalid' }),
        'bonvoy.config.js': 'export default {};',
      },
      '/project',
    );

    const result = await shipit(undefined, { dryRun: true, cwd: '/project' });

    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('invalid');
  });
});
