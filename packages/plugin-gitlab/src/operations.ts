import { Gitlab } from '@gitbeaker/rest';

export interface GitLabReleaseParams {
  projectId: string | number;
  tagName: string;
  name: string;
  description: string;
}

export interface GitLabOperations {
  createRelease(token: string, host: string, params: GitLabReleaseParams): Promise<void>;
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
  /* v8 ignore stop */
};
