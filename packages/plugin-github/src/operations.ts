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

export interface GitHubOperations {
  createRelease(token: string, params: GitHubReleaseParams): Promise<void>;
}

export const defaultGitHubOperations: GitHubOperations = {
  async createRelease(token, params) {
    const octokit = new Octokit({ auth: token });
    await octokit.repos.createRelease({ ...params });
  },
};
