import type { GitOperations } from '@bonvoy/plugin-git';
import type { GitHubOperations, GitHubReleaseParams } from '@bonvoy/plugin-github';
import type { NpmOperations } from '@bonvoy/plugin-npm';

export interface MockGitOperations extends GitOperations {
  calls: Array<{ method: string; args: any[] }>;
  commits: Array<{ hash: string; message: string; author: string; date: string; files: string[] }>;
  lastTag: string | null;
}

export function createMockGitOperations(
  config: {
    commits?: Array<{
      hash: string;
      message: string;
      author: string;
      date: string;
      files: string[];
    }>;
    lastTag?: string | null;
  } = {},
): MockGitOperations {
  const calls: Array<{ method: string; args: any[] }> = [];
  const commits = config.commits ?? [];
  const lastTag = config.lastTag ?? null;

  return {
    calls,
    commits,
    lastTag,

    async add(files, cwd) {
      calls.push({ method: 'add', args: [files, cwd] });
    },

    async commit(message, cwd) {
      calls.push({ method: 'commit', args: [message, cwd] });
    },

    async tag(name, cwd) {
      calls.push({ method: 'tag', args: [name, cwd] });
    },

    async push(cwd) {
      calls.push({ method: 'push', args: [cwd] });
    },

    async pushTags(tags, cwd) {
      calls.push({ method: 'pushTags', args: [tags, cwd] });
    },

    async getLastTag(_cwd) {
      calls.push({ method: 'getLastTag', args: [_cwd] });
      return lastTag;
    },

    async getCommitsSinceTag(_tag, _cwd) {
      calls.push({ method: 'getCommitsSinceTag', args: [_tag, _cwd] });
      return commits;
    },
  };
}

export interface MockNpmOperations extends NpmOperations {
  calls: Array<{ method: string; args: any[] }>;
  publishedVersions: Map<string, string>;
}

export function createMockNpmOperations(): MockNpmOperations {
  const calls: Array<{ method: string; args: any[] }> = [];
  const publishedVersions = new Map<string, string>();

  return {
    calls,
    publishedVersions,

    async publish(args, cwd) {
      calls.push({ method: 'publish', args: [args, cwd] });
    },

    async view(pkg, version) {
      calls.push({ method: 'view', args: [pkg, version] });
      return publishedVersions.get(`${pkg}@${version}`) ?? null;
    },
  };
}

export interface MockGitHubOperations extends GitHubOperations {
  calls: Array<{ method: string; args: any[] }>;
}

export function createMockGitHubOperations(): MockGitHubOperations {
  const calls: Array<{ method: string; args: any[] }> = [];

  return {
    calls,

    async createRelease(token: string, params: GitHubReleaseParams) {
      calls.push({ method: 'createRelease', args: [token, params] });
    },
  };
}

export function createMockCommit(
  type: string,
  message: string,
  files: string[],
  options: { breaking?: boolean } = {},
) {
  const fullMessage = options.breaking ? `${type}!: ${message}` : `${type}: ${message}`;
  return {
    hash: `abc${Math.random().toString(36).slice(2, 8)}`,
    message: fullMessage,
    author: 'Test Author',
    date: new Date().toISOString(),
    files,
  };
}
