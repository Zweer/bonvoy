import { describe, expect, it } from 'vitest';

import ChangelogPlugin from '../src/index.js';

describe('ChangelogPlugin', () => {
  it('should export plugin', () => {
    expect(ChangelogPlugin).toBeDefined();
    expect(typeof ChangelogPlugin).toBe('function');
  });

  it('should have correct name', () => {
    const plugin = new ChangelogPlugin();
    expect(plugin.name).toBe('changelog');
  });
});
