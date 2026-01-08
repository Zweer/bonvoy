import { describe, expect, it } from 'vitest';

import type { BonvoyConfig, BonvoyPlugin, Context, Package } from '../src/types.js';

describe('types', () => {
  it('should define BonvoyConfig interface', () => {
    const config: BonvoyConfig = {
      versioning: 'independent',
      rootVersionStrategy: 'max',
    };

    expect(config.versioning).toBe('independent');
    expect(config.rootVersionStrategy).toBe('max');
  });

  it('should define Package interface', () => {
    const pkg: Package = {
      name: '@test/pkg',
      version: '1.0.0',
      path: '/test/path',
    };

    expect(pkg.name).toBe('@test/pkg');
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.path).toBe('/test/path');
  });

  it('should define Context interface', () => {
    const context: Context = {
      config: { versioning: 'independent' },
      packages: [],
      changedPackages: [],
      rootPath: '/test',
      isDryRun: false,
    };

    expect(context.config.versioning).toBe('independent');
    expect(context.packages).toEqual([]);
    expect(context.isDryRun).toBe(false);
  });

  it('should define BonvoyPlugin interface', () => {
    const plugin: BonvoyPlugin = {
      name: 'test-plugin',
      apply: () => {},
    };

    expect(plugin.name).toBe('test-plugin');
    expect(typeof plugin.apply).toBe('function');
  });
});
