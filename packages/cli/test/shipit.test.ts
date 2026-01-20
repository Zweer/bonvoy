import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shipit } from '../src/commands/shipit.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa');
vi.mock('@bonvoy/core', async () => {
  const actual = await vi.importActual('@bonvoy/core');
  return {
    ...actual,
    loadConfig: vi.fn().mockResolvedValue({}),
  };
});

describe('shipit command', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('should handle workspace with changes', async () => {
    const { execa } = await import('execa');

    // Mock git commands
    vi.mocked(execa).mockImplementation((async (cmd: string, args: string[]) => {
      if (cmd === 'npm' && args[0] === 'query') {
        return { stdout: JSON.stringify([]) };
      }
      if (cmd === 'git' && args[0] === 'describe') {
        throw new Error('No tags');
      }
      if (cmd === 'git' && args[0] === 'log') {
        return {
          stdout: `abc123|feat: add feature|Test|2024-01-01T00:00:00Z
src/index.ts`,
        };
      }
      return { stdout: '' };
    }) as never);

    // Setup filesystem
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
      },
      '/test',
    );

    const result = await shipit(undefined, { dryRun: true, cwd: '/test' });

    expect(result.packages).toHaveLength(1);
    expect(result.changedPackages).toHaveLength(1);
    expect(result.versions['test-pkg']).toBe('1.1.0');
  });

  it('should handle no changes', async () => {
    const { execa } = await import('execa');

    vi.mocked(execa).mockImplementation((async (cmd: string, args: string[]) => {
      if (cmd === 'npm' && args[0] === 'query') {
        return { stdout: JSON.stringify([]) };
      }
      if (cmd === 'git' && args[0] === 'describe') {
        throw new Error('No tags');
      }
      if (cmd === 'git' && args[0] === 'log') {
        return {
          stdout: `abc123|chore: update deps|Test|2024-01-01T00:00:00Z
package.json`,
        };
      }
      return { stdout: '' };
    }) as never);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
        }),
      },
      '/test',
    );

    const result = await shipit(undefined, { dryRun: true, cwd: '/test' });

    expect(result.changedPackages).toHaveLength(0);
  });
});
