import { Octokit } from '@octokit/rest';

export interface GitHubReleaseParams {
  owner: string;
  repo: string;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
}

export interface GitHubPRParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface GitHubPRResult {
  url: string;
  number: number;
}

export interface GitHubOperations {
  createRelease(token: string, params: GitHubReleaseParams): Promise<{ id: number }>;
  createPR(token: string, params: GitHubPRParams): Promise<GitHubPRResult>;
  releaseExists(token: string, owner: string, repo: string, tag: string): Promise<boolean>;
  deleteRelease(token: string, owner: string, repo: string, releaseId: number): Promise<void>;
}

export const defaultGitHubOperations: GitHubOperations = {
  /* c8 ignore start - real API calls */
  async createRelease(token, params) {
    const noop = () => {};
    const octokit = new Octokit({
      auth: token,
      log: { debug: noop, info: noop, warn: noop, error: noop },
    });
    const { data } = await octokit.repos.createRelease({ ...params });
    return { id: data.id };
  },

  async createPR(token, params) {
    const noop = () => {};
    const octokit = new Octokit({
      auth: token,
      log: { debug: noop, info: noop, warn: noop, error: noop },
    });
    const { data } = await octokit.pulls.create({ ...params });
    return { url: data.html_url, number: data.number };
  },

  async releaseExists(token, owner, repo, tag) {
    const noop = () => {};
    const octokit = new Octokit({
      auth: token,
      log: { debug: noop, info: noop, warn: noop, error: noop },
    });
    try {
      await octokit.repos.getReleaseByTag({ owner, repo, tag });
      return true;
    } catch {
      return false;
    }
  },

  async deleteRelease(token, owner, repo, releaseId) {
    const noop = () => {};
    const octokit = new Octokit({
      auth: token,
      log: { debug: noop, info: noop, warn: noop, error: noop },
    });
    await octokit.repos.deleteRelease({ owner, repo, release_id: releaseId });
  },
  /* c8 ignore stop */
};
