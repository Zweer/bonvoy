import { describe, expect, it } from 'vitest';

import GitLabPlugin, { defaultGitLabOperations } from '../src/index.js';

describe('plugin-gitlab exports', () => {
  it('should export GitLabPlugin as default', () => {
    expect(GitLabPlugin).toBeDefined();
    expect(new GitLabPlugin().name).toBe('gitlab');
  });

  it('should export defaultGitLabOperations', () => {
    expect(defaultGitLabOperations).toBeDefined();
    expect(defaultGitLabOperations.createRelease).toBeInstanceOf(Function);
  });
});
