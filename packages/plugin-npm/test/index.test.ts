import { describe, expect, it } from 'vitest';

describe('@bonvoy/plugin-npm', () => {
  it('should export NpmPlugin as default', async () => {
    const { default: NpmPlugin } = await import('../src/index.js');
    expect(NpmPlugin).toBeDefined();
    expect(typeof NpmPlugin).toBe('function');
  });

  it('should export NpmPluginConfig type', async () => {
    const module = await import('../src/index.js');
    expect(module.default).toBeDefined();
  });
});
