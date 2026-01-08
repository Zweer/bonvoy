import { describe, expect, it } from 'vitest';

import { Bonvoy } from '../src/bonvoy.js';
import type { BonvoyPlugin } from '../src/schema.js';

describe('Bonvoy', () => {
  it('should create instance with default config', () => {
    const bonvoy = new Bonvoy();

    expect(bonvoy.config).toEqual({});
    expect(bonvoy.plugins).toEqual([]);
    expect(bonvoy.hooks).toBeDefined();
  });

  it('should create instance with custom config', () => {
    const config = { versioning: 'fixed' as const };
    const bonvoy = new Bonvoy(config);

    expect(bonvoy.config).toEqual(config);
  });

  it('should register plugin', () => {
    const bonvoy = new Bonvoy();
    const plugin: BonvoyPlugin = {
      name: 'test-plugin',
      apply: (bonvoy) => {
        bonvoy.hooks.beforeShipIt.tap('test-plugin', () => {});
      },
    };

    bonvoy.use(plugin);

    expect(bonvoy.plugins).toHaveLength(1);
    expect(bonvoy.plugins[0]).toBe(plugin);
  });

  it('should have all required hooks', () => {
    const bonvoy = new Bonvoy();

    // Configuration phase
    expect(bonvoy.hooks.modifyConfig).toBeDefined();

    // Validation phase
    expect(bonvoy.hooks.beforeShipIt).toBeDefined();
    expect(bonvoy.hooks.validateRepo).toBeDefined();

    // Version phase
    expect(bonvoy.hooks.getVersion).toBeDefined();
    expect(bonvoy.hooks.version).toBeDefined();
    expect(bonvoy.hooks.afterVersion).toBeDefined();

    // Changelog phase
    expect(bonvoy.hooks.beforeChangelog).toBeDefined();
    expect(bonvoy.hooks.generateChangelog).toBeDefined();
    expect(bonvoy.hooks.afterChangelog).toBeDefined();

    // Publish phase
    expect(bonvoy.hooks.beforePublish).toBeDefined();
    expect(bonvoy.hooks.publish).toBeDefined();
    expect(bonvoy.hooks.afterPublish).toBeDefined();

    // Release phase
    expect(bonvoy.hooks.beforeRelease).toBeDefined();
    expect(bonvoy.hooks.makeRelease).toBeDefined();
    expect(bonvoy.hooks.afterRelease).toBeDefined();

    // PR workflow
    expect(bonvoy.hooks.beforeCreatePR).toBeDefined();
    expect(bonvoy.hooks.createPR).toBeDefined();
    expect(bonvoy.hooks.afterCreatePR).toBeDefined();
  });
});
