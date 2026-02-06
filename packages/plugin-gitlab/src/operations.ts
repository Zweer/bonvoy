import { Gitlab } from '@gitbeaker/rest';

export interface GitLabReleaseParams {
  projectId: string | number;
  tagName: string;
  name: string;
  description: string;
}

export interface GitLabMRParams {
  projectId: string | number;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface GitLabMRResult {
  url: string;
  iid: number;
}

export interface GitLabOperations {
  createRelease(token: string, host: string, params: GitLabReleaseParams): Promise<void>;
  createMR(token: string, host: string, params: GitLabMRParams): Promise<GitLabMRResult>;
  releaseExists(
    token: string,
    host: string,
    projectId: string | number,
    tagName: string,
  ): Promise<boolean>;
}

export const defaultGitLabOperations: GitLabOperations = {
  /* v8 ignore start */
  async createRelease(token, host, params) {
    const api = new Gitlab({ token, host });
    await api.ProjectReleases.create(params.projectId, {
      tagName: params.tagName,
      name: params.name,
      description: params.description,
    });
  },

  async createMR(token, host, params) {
    const api = new Gitlab({ token, host });
    const mr = await api.MergeRequests.create(
      params.projectId,
      params.sourceBranch,
      params.targetBranch,
      params.title,
      {
        description: params.description,
      },
    );
    return { url: mr.web_url, iid: mr.iid };
  },

  async releaseExists(token, host, projectId, tagName) {
    const api = new Gitlab({ token, host });
    try {
      await api.ProjectReleases.show(projectId, tagName);
      return true;
    } catch {
      return false;
    }
  },
  /* v8 ignore stop */
};
