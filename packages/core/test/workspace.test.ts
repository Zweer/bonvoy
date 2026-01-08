import { describe, expect, it } from 'vitest';

import { assignCommitsToPackages, getPackageFromPath } from '../src/workspace.js';

describe('workspace', () => {
  describe('getPackageFromPath', () => {
    const packages = [
      { name: 'root', path: '/test', version: '1.0.0' },
      { name: '@test/core', path: '/test/packages/core', version: '1.0.0' },
      { name: '@test/utils', path: '/test/packages/utils', version: '1.0.0' },
    ];

    it('should find package for file path', () => {
      const pkg = getPackageFromPath(packages, '/test/packages/core/src/index.ts', '/test');

      expect(pkg?.name).toBe('@test/core');
    });

    it('should find root package for root file', () => {
      const pkg = getPackageFromPath(packages, '/test/README.md', '/test');

      expect(pkg?.name).toBe('root');
    });

    it('should return null for unmatched path', () => {
      const pkg = getPackageFromPath(packages, '/other/file.ts', '/test');

      expect(pkg).toBeNull();
    });

    it('should handle exact package path match', () => {
      const pkg = getPackageFromPath(packages, '/test/packages/core', '/test');

      expect(pkg?.name).toBe('@test/core');
    });

    it('should find most specific package match', () => {
      const nestedPackages = [
        { name: 'root', path: '/test', version: '1.0.0' },
        { name: '@test/packages', path: '/test/packages', version: '1.0.0' },
        { name: '@test/core', path: '/test/packages/core', version: '1.0.0' },
      ];

      const pkg = getPackageFromPath(nestedPackages, '/test/packages/core/src/index.ts', '/test');

      expect(pkg?.name).toBe('@test/core');
    });

    it('should handle root package with dot path', () => {
      const packagesWithDot = [
        { name: 'root', path: '/test', version: '1.0.0' },
        { name: '@test/core', path: '/test/packages/core', version: '1.0.0' },
      ];

      const pkg = getPackageFromPath(packagesWithDot, '/test/README.md', '/test');

      expect(pkg?.name).toBe('root');
    });

    it('should handle relative paths correctly', () => {
      // Test with current working directory scenario
      const packagesWithRelative = [
        { name: 'root', path: '/current', version: '1.0.0' },
        { name: '@test/core', path: '/current/packages/core', version: '1.0.0' },
      ];

      const pkg = getPackageFromPath(packagesWithRelative, '/current/package.json', '/current');

      expect(pkg?.name).toBe('root');
    });

    it('should not match root package for nested files when better match exists', () => {
      const pkg = getPackageFromPath(packages, '/test/packages/core/nested/file.ts', '/test');

      expect(pkg?.name).toBe('@test/core');
    });

    it('should handle empty packages array', () => {
      const pkg = getPackageFromPath([], '/test/file.ts', '/test');

      expect(pkg).toBeNull();
    });

    it('should prefer longer path matches over shorter ones', () => {
      const packagesWithOverlap = [
        { name: 'root', path: '/test', version: '1.0.0' },
        { name: '@test/packages', path: '/test/packages', version: '1.0.0' },
        { name: '@test/core', path: '/test/packages/core', version: '1.0.0' },
        { name: '@test/short', path: '/test/pack', version: '1.0.0' }, // Shorter match
      ];

      // This should match @test/core (longest) not @test/packages or @test/short
      const pkg = getPackageFromPath(
        packagesWithOverlap,
        '/test/packages/core/src/index.ts',
        '/test',
      );

      expect(pkg?.name).toBe('@test/core');
    });

    it('should not update match when length is not better', () => {
      // Order packages so shorter match comes after longer match
      const packagesOrdered = [
        { name: '@test/core', path: '/test/packages/core', version: '1.0.0' }, // Longer - will be first match
        { name: '@test/packages', path: '/test/packages', version: '1.0.0' }, // Shorter - should not override
      ];

      const pkg = getPackageFromPath(packagesOrdered, '/test/packages/core/src/index.ts', '/test');

      // Should still be @test/core, not overridden by @test/packages
      expect(pkg?.name).toBe('@test/core');
    });
  });

  describe('assignCommitsToPackages', () => {
    const packages = [
      { name: 'root', path: '/test', version: '1.0.0' },
      { name: '@test/core', path: '/test/packages/core', version: '1.0.0' },
    ];

    it('should assign commits to packages', () => {
      const commits = [
        { files: ['packages/core/src/index.ts', 'README.md'] },
        { files: ['packages/core/test/index.test.ts'] },
      ];

      const result = assignCommitsToPackages(commits, packages, '/test');

      expect(result[0].packages).toEqual(['@test/core', 'root']);
      expect(result[1].packages).toEqual(['@test/core']);
    });

    it('should handle commits with no matching packages', () => {
      const commits = [{ files: ['unmatched/file.ts'] }];

      const result = assignCommitsToPackages(commits, packages, '/test');

      expect(result[0].packages).toEqual([]);
    });

    it('should handle commits with duplicate package matches', () => {
      const commits = [{ files: ['packages/core/src/index.ts', 'packages/core/src/config.ts'] }];

      const result = assignCommitsToPackages(commits, packages, '/test');

      expect(result[0].packages).toEqual(['@test/core']);
    });

    it('should preserve original commit properties', () => {
      const commits = [{ files: ['README.md'], hash: 'abc123', message: 'test commit' }];

      const result = assignCommitsToPackages(commits, packages, '/test');

      expect(result[0]).toEqual({
        files: ['README.md'],
        hash: 'abc123',
        message: 'test commit',
        packages: ['root'],
      });
    });

    it('should handle empty commits array', () => {
      const result = assignCommitsToPackages([], packages, '/test');

      expect(result).toEqual([]);
    });

    it('should handle commits with empty files array', () => {
      const commits = [{ files: [] }];

      const result = assignCommitsToPackages(commits, packages, '/test');

      expect(result[0].packages).toEqual([]);
    });
  });
});
