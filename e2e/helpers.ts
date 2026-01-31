import type { Options } from 'execa';

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

export interface ExecaCall {
  cmd: string;
  args: string[];
  options?: Options;
}

// Shared state for mock configuration
let gitCommits: MockGitCommit[] = [];
let gitLastTag: string | null = null;
let npmWorkspaces: MockPackage[] = [];
let gitRemoteUrl = 'git@github.com:test/repo.git';
const execaCalls: ExecaCall[] = [];

// Mock implementation function
export function execaMockImpl(
  cmd: string,
  args: string[] = [],
  options?: Options,
): Promise<{ stdout: string }> {
  execaCalls.push({ cmd, args, options });

  // Git log with tag range (e.g., git log v1.0.0..HEAD)
  if (cmd === 'git' && args[0] === 'log' && args[1]?.includes('..')) {
    return Promise.resolve({ stdout: formatGitLog(gitCommits) });
  }

  // Git log without tag range
  if (cmd === 'git' && args[0] === 'log') {
    return Promise.resolve({ stdout: formatGitLog(gitCommits) });
  }

  // Git describe (last tag)
  if (cmd === 'git' && args[0] === 'describe') {
    if (!gitLastTag) {
      return Promise.reject(new Error('fatal: No names found, cannot describe anything.'));
    }
    return Promise.resolve({ stdout: gitLastTag });
  }

  // Git remote get-url
  if (cmd === 'git' && args[0] === 'remote' && args[1] === 'get-url') {
    return Promise.resolve({ stdout: gitRemoteUrl });
  }

  // Git add, commit, tag, push - return empty stdout (success)
  if (cmd === 'git' && ['add', 'commit', 'tag', 'push'].includes(args[0])) {
    return Promise.resolve({ stdout: '' });
  }

  // npm query (workspaces)
  if (cmd === 'npm' && args[0] === 'query') {
    return Promise.resolve({ stdout: JSON.stringify(npmWorkspaces) });
  }

  // npm publish - return empty stdout (success)
  if (cmd === 'npm' && args[0] === 'publish') {
    return Promise.resolve({ stdout: '' });
  }

  // npm view - simulate package not found (for new packages)
  if (cmd === 'npm' && args[0] === 'view') {
    return Promise.reject(new Error('npm ERR! code E404'));
  }

  // Default: return empty stdout
  return Promise.resolve({ stdout: '' });
}

function formatGitLog(commits: MockGitCommit[]): string {
  return commits
    .map((commit) => {
      const header = `${commit.hash}|${commit.message}|${commit.author}|${commit.date}`;
      const files = commit.files.join('\n');
      return `${header}\n${files}`;
    })
    .join('\n\n');
}

// Helper to create mock execa controller
export function createMockExeca() {
  return {
    getCalls: () => [...execaCalls],
    clearCalls: () => {
      execaCalls.length = 0;
    },
    setGitCommits: (commits: MockGitCommit[]) => {
      gitCommits = commits;
    },
    setGitLastTag: (tag: string | null) => {
      gitLastTag = tag;
    },
    setNpmWorkspaces: (workspaces: MockPackage[]) => {
      npmWorkspaces = workspaces;
    },
    setGitRemoteUrl: (url: string) => {
      gitRemoteUrl = url;
    },
    reset: () => {
      gitCommits = [];
      gitLastTag = null;
      npmWorkspaces = [];
      gitRemoteUrl = 'git@github.com:test/repo.git';
      execaCalls.length = 0;
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
    hash: options.hash || `abc${Math.random().toString(36).slice(2, 8)}`,
    message: fullMessage,
    author: options.author || 'Test Author',
    date: options.date || '2026-01-18T10:00:00Z',
    files,
  };
}
