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
  createRelease(token: string, params: GitHubReleaseParams): Promise<void>;
  createPR(token: string, params: GitHubPRParams): Promise<GitHubPRResult>;
  releaseExists(token: string, owner: string, repo: string, tag: string): Promise<boolean>;
}

export const defaultGitHubOperations: GitHubOperations = {
  /* c8 ignore start - real API calls */
  async createRelease(token, params) {
    const octokit = new Octokit({ auth: token });
    await octokit.repos.createRelease({ ...params });
  },

  async createPR(token, params) {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.pulls.create({ ...params });
    return { url: data.html_url, number: data.number };
  },

  async releaseExists(token, owner, repo, tag) {
    const octokit = new Octokit({ auth: token });
    try {
      await octokit.repos.getReleaseByTag({ owner, repo, tag });
      return true;
    } catch {
      return false;
    }
  },
  /* c8 ignore stop */
};
