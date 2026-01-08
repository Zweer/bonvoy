import { describe, expect, it } from 'vitest';

describe('index exports coverage', () => {
  it('should import and execute all exports', async () => {
    // Direct import to ensure index.ts is executed
    const indexModule = await import('../src/index.js');

    // Verify all expected exports exist
    expect(indexModule.Bonvoy).toBeDefined();
    expect(indexModule.loadConfig).toBeDefined();
    expect(indexModule.mergeConfig).toBeDefined();
    expect(indexModule.getPackageFromPath).toBeDefined();
    expect(indexModule.assignCommitsToPackages).toBeDefined();
    expect(indexModule.generateSchema).toBeDefined();
    expect(indexModule.BonvoyConfigSchema).toBeDefined();

    // Create instances to ensure code execution
    const bonvoy = new indexModule.Bonvoy();
    expect(bonvoy).toBeInstanceOf(indexModule.Bonvoy);

    // Call functions to ensure they're executed
    const defaultConfig = await indexModule.loadConfig('/nonexistent');
    expect(defaultConfig.versioning).toBe('independent');

    // Test schema
    const validConfig = indexModule.BonvoyConfigSchema.parse({});
    expect(validConfig.versioning).toBe('independent');
  });
});
