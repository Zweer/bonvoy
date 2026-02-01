import type { GitOperations } from '@bonvoy/plugin-git';
import type { GitHubOperations, GitHubReleaseParams } from '@bonvoy/plugin-github';
import type { NpmOperations } from '@bonvoy/plugin-npm';

export interface MockGitOperations extends GitOperations {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
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
    currentBranch?: string;
    existingTags?: string[];
  } = {},
): MockGitOperations {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  const commits = config.commits ?? [];
  const lastTag = config.lastTag ?? null;
  const currentBranch = config.currentBranch ?? 'feature-branch';
  const existingTags = new Set(config.existingTags ?? []);

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

    async checkout(branch, cwd, create) {
      calls.push({ method: 'checkout', args: [branch, cwd, create] });
    },

    async getCurrentBranch(_cwd) {
      calls.push({ method: 'getCurrentBranch', args: [_cwd] });
      return currentBranch;
    },

    async tagExists(name, _cwd) {
      calls.push({ method: 'tagExists', args: [name, _cwd] });
      return existingTags.has(name);
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
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  calls: Array<{ method: string; args: any[] }>;
  publishedVersions: Map<string, string>;
  existingPackages: Set<string>;
  hasTokenValue: boolean;
}

export function createMockNpmOperations(
  config: { existingPackages?: string[]; hasToken?: boolean } = {},
): MockNpmOperations {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  const publishedVersions = new Map<string, string>();
  const existingPackages = new Set(config.existingPackages ?? []);
  const hasTokenValue = config.hasToken ?? true;

  return {
    calls,
    publishedVersions,
    existingPackages,
    hasTokenValue,

    async publish(args, cwd) {
      calls.push({ method: 'publish', args: [args, cwd] });
    },

    async view(pkg, version) {
      calls.push({ method: 'view', args: [pkg, version] });
      return publishedVersions.get(`${pkg}@${version}`) ?? null;
    },

    async packageExists(pkg) {
      calls.push({ method: 'packageExists', args: [pkg] });
      return existingPackages.has(pkg);
    },

    async hasToken() {
      calls.push({ method: 'hasToken', args: [] });
      return hasTokenValue;
    },
  };
}

export interface MockGitHubOperations extends GitHubOperations {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  calls: Array<{ method: string; args: any[] }>;
  existingReleases: Set<string>;
}

export function createMockGitHubOperations(
  config: { existingReleases?: string[] } = {},
): MockGitHubOperations {
  // biome-ignore lint/suspicious/noExplicitAny: Test mock needs flexible args
  const calls: Array<{ method: string; args: any[] }> = [];
  const existingReleases = new Set(config.existingReleases ?? []);

  return {
    calls,
    existingReleases,

    async createRelease(token: string, params: GitHubReleaseParams) {
      calls.push({ method: 'createRelease', args: [token, params] });
    },

    async createPR(token, params) {
      calls.push({ method: 'createPR', args: [token, params] });
      return { url: 'https://github.com/test/repo/pull/1', number: 1 };
    },

    async releaseExists(_token, _owner, _repo, tag) {
      calls.push({ method: 'releaseExists', args: [_token, _owner, _repo, tag] });
      return existingReleases.has(tag);
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
