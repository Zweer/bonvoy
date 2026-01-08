import { describe, expect, it } from 'vitest';

describe('index exports coverage', () => {
  it('should import and execute all exports', async () => {
    // Dynamic import to ensure all exports are executed
    const coreModule = await import('../src/index.js');

    // Verify all expected exports exist
    expect(coreModule.Bonvoy).toBeDefined();
    expect(coreModule.loadConfig).toBeDefined();
    expect(coreModule.mergeConfig).toBeDefined();
    expect(coreModule.getPackageFromPath).toBeDefined();
    expect(coreModule.assignCommitsToPackages).toBeDefined();

    // Create instances to ensure code execution
    const bonvoy = new coreModule.Bonvoy();
    expect(bonvoy).toBeInstanceOf(coreModule.Bonvoy);

    // Call functions to ensure they're executed
    const defaultConfig = await coreModule.loadConfig('/nonexistent');
    expect(defaultConfig.versioning).toBe('independent');
  });
});
