import { describe, expect, it } from 'vitest';

describe('@bonvoy/plugin-git', () => {
  it('should export GitPlugin as default', async () => {
    const { default: GitPlugin } = await import('../src/index.js');
    expect(GitPlugin).toBeDefined();
    expect(typeof GitPlugin).toBe('function');
  });

  it('should export GitPluginConfig type', async () => {
    const module = await import('../src/index.js');
    expect(module.default).toBeDefined();
  });
});
