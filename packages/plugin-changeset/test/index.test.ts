import { describe, expect, it } from 'vitest';

import ChangesetPlugin, { defaultChangesetOperations, isBumpType } from '../src/index.js';

describe('plugin-changeset exports', () => {
  it('should export ChangesetPlugin as default', () => {
    expect(ChangesetPlugin).toBeDefined();
    expect(new ChangesetPlugin().name).toBe('changeset');
  });

  it('should export defaultChangesetOperations', () => {
    expect(defaultChangesetOperations).toBeDefined();
    expect(defaultChangesetOperations.readDir).toBeInstanceOf(Function);
    expect(defaultChangesetOperations.readFile).toBeInstanceOf(Function);
    expect(defaultChangesetOperations.removeFile).toBeInstanceOf(Function);
    expect(defaultChangesetOperations.exists).toBeInstanceOf(Function);
  });

  it('should export isBumpType', () => {
    expect(isBumpType).toBeInstanceOf(Function);
    expect(isBumpType('minor')).toBe(true);
  });
});
