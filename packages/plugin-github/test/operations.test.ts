import { describe, expect, it, vi } from 'vitest';

const mockCreateRelease = vi.fn();
vi.mock('@octokit/rest', () => ({
  Octokit: class {
    repos = { createRelease: mockCreateRelease };
  },
}));

import { defaultGitHubOperations } from '../src/operations.js';

describe('defaultGitHubOperations', () => {
  it('createRelease calls Octokit', async () => {
    const params = {
      owner: 'test',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'v1.0.0',
      body: 'changelog',
      draft: false,
      prerelease: false,
    };

    await defaultGitHubOperations.createRelease('token123', params);

    expect(mockCreateRelease).toHaveBeenCalledWith(params);
  });
});
