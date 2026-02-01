import { describe, expect, it } from 'vitest';

import { defaultGitLabOperations } from '../src/operations.js';

describe('defaultGitLabOperations', () => {
  it('should have createRelease function', () => {
    expect(defaultGitLabOperations.createRelease).toBeInstanceOf(Function);
  });
});
