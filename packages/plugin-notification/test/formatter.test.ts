import { describe, expect, it } from 'vitest';

import { formatChangelog, formatMessage, formatPackageList } from '../src/formatter.js';
import type { NotificationPackage } from '../src/types.js';

const mockContext = {
  config: {},
  packages: [],
  changedPackages: [
    { name: '@test/core', version: '1.0.0', path: '/test/core' },
    { name: '@test/cli', version: '2.0.0', path: '/test/cli' },
  ],
  rootPath: '/test',
  isDryRun: false,
  logger: { info: () => {}, warn: () => {}, error: () => {} },
  commits: [],
  versions: { '@test/core': '1.1.0', '@test/cli': '2.1.0' },
  bumps: { '@test/core': 'minor', '@test/cli': 'minor' },
  changelogs: {
    '@test/core': '## 1.1.0\n\n- feat: new feature',
    '@test/cli': '## 2.1.0\n\n- fix: bug fix',
  },
  releases: {},
};

describe('formatMessage', () => {
  it('should format message with default config', () => {
    const result = formatMessage(mockContext as never, {});

    expect(result.title).toBe('🚀 Released 2 package(s)');
    expect(result.packages).toHaveLength(2);
    expect(result.packages[0].name).toBe('@test/core');
    expect(result.packages[0].version).toBe('1.1.0');
    expect(result.packages[0].changelog).toContain('feat: new feature');
    expect(result.packages[0].npmUrl).toBe('https://www.npmjs.com/package/@test/core');
    expect(result.isSuccess).toBe(true);
  });

  it('should use custom title template', () => {
    const result = formatMessage(mockContext as never, {
      titleTemplate: 'New release: {packages}',
    });

    expect(result.title).toBe('New release: @test/core@1.1.0, @test/cli@2.1.0');
  });

  it('should truncate long changelogs', () => {
    const longChangelog = 'a'.repeat(1000);
    const ctx = {
      ...mockContext,
      changelogs: { '@test/core': longChangelog, '@test/cli': '' },
    };

    const result = formatMessage(ctx as never, { maxChangelogLength: 100 });

    expect(result.packages[0].changelog).toHaveLength(103); // 100 + '...'
    expect(result.packages[0].changelog?.endsWith('...')).toBe(true);
  });

  it('should exclude changelog when disabled', () => {
    const result = formatMessage(mockContext as never, { includeChangelog: false });

    expect(result.packages[0].changelog).toBeUndefined();
  });

  it('should exclude links when disabled', () => {
    const result = formatMessage(mockContext as never, { includeLinks: false });

    expect(result.packages[0].npmUrl).toBeUndefined();
  });
});

describe('formatPackageList', () => {
  it('should format package list', () => {
    const packages: NotificationPackage[] = [
      { name: '@test/core', version: '1.0.0' },
      { name: '@test/cli', version: '2.0.0' },
    ];

    const result = formatPackageList(packages);

    expect(result).toBe('• @test/core@1.0.0\n• @test/cli@2.0.0');
  });
});

describe('formatChangelog', () => {
  it('should format changelog for packages with changes', () => {
    const packages: NotificationPackage[] = [
      { name: '@test/core', version: '1.0.0', changelog: '- feat: new' },
      { name: '@test/cli', version: '2.0.0' }, // no changelog
    ];

    const result = formatChangelog(packages);

    expect(result).toBe('**@test/core@1.0.0**\n- feat: new');
    expect(result).not.toContain('@test/cli');
  });
});
