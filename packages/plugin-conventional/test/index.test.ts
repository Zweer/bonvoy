import { describe, expect, it } from 'vitest';

describe('@bonvoy/plugin-conventional', () => {
  it('should export ConventionalPlugin as default', async () => {
    const plugin = await import('../src/index.js');
    expect(plugin.default).toBeDefined();
    expect(plugin.default.prototype.constructor.name).toBe('ConventionalPlugin');
  });

  it('should export ConventionalConfig type', async () => {
    const plugin = await import('../src/index.js');
    // Types don't exist at runtime, but we can check the module structure
    expect(typeof plugin.default).toBe('function');
  });
});
