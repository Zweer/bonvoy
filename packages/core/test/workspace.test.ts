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
  });
});
