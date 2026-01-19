import type { ExecaReturnValue } from 'execa';
import { vi } from 'vitest';

export interface MockGitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

export interface MockPackage {
  name: string;
  version: string;
  location: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function createMockExeca() {
  let gitCommits: MockGitCommit[] = [];
  let gitLastTag: string | null = null;
  let npmWorkspaces: MockPackage[] = [];

  const mockFn = vi.fn<[string, string[]], Promise<Partial<ExecaReturnValue>>>(
    (cmd: string, args: string[]): Promise<Partial<ExecaReturnValue>> => {
      // Git log
      if (cmd === 'git' && args[0] === 'log') {
        const output = gitCommits
          .map((commit) => {
            const header = `${commit.hash}|${commit.message}|${commit.author}|${commit.date}`;
            const files = commit.files.join('\n');
            return `${header}\n${files}`;
          })
          .join('\n\n');

        return Promise.resolve({ stdout: output });
      }

      // Git describe (last tag)
      if (cmd === 'git' && args[0] === 'describe') {
        if (!gitLastTag) {
          return Promise.reject(new Error('No tags found'));
        }
        return Promise.resolve({ stdout: gitLastTag });
      }

      // npm query (workspaces)
      if (cmd === 'npm' && args[0] === 'query') {
        return Promise.resolve({ stdout: JSON.stringify(npmWorkspaces) });
      }

      return Promise.resolve({ stdout: '' });
    },
  );

  return {
    mockFn,
    setGitCommits: (commits: MockGitCommit[]) => {
      gitCommits = commits;
    },
    setGitLastTag: (tag: string | null) => {
      gitLastTag = tag;
    },
    setNpmWorkspaces: (workspaces: MockPackage[]) => {
      npmWorkspaces = workspaces;
    },
  };
}

export function createMockCommit(
  type: string,
  message: string,
  files: string[],
  options: { breaking?: boolean; hash?: string; author?: string; date?: string } = {},
): MockGitCommit {
  const fullMessage = options.breaking ? `${type}!: ${message}` : `${type}: ${message}`;

  return {
    hash: options.hash || 'abc123',
    message: fullMessage,
    author: options.author || 'Test Author',
    date: options.date || '2026-01-18T10:00:00Z',
    files,
  };
}
