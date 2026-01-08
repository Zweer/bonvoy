import { relative, resolve } from 'node:path';

import type { Package } from './types.js';

export function assignCommitsToPackages(
  commits: Array<{ files: string[] }>,
  packages: Package[],
  rootPath: string,
): Array<{ packages: string[] }> {
  return commits.map((commit) => {
    const affectedPackages = new Set<string>();

    for (const file of commit.files) {
      const pkg = getPackageFromPath(packages, resolve(rootPath, file), rootPath);
      if (pkg) {
        affectedPackages.add(pkg.name);
      }
    }

    return {
      ...commit,
      packages: Array.from(affectedPackages),
    };
  });
}

export function getPackageFromPath(
  packages: Package[],
  filePath: string,
  rootPath: string,
): Package | null {
  const relativePath = relative(rootPath, filePath);

  // Find the package that contains this file path
  let bestMatch: Package | null = null;
  let bestMatchLength = -1;

  for (const pkg of packages) {
    const pkgRelativePath = relative(rootPath, pkg.path);

    // Handle root package (empty relative path)
    if (pkgRelativePath === '' || pkgRelativePath === '.') {
      // Only match root package if no other package matches or if file is directly in root
      if (!relativePath.includes('/') && bestMatchLength < 0) {
        bestMatch = pkg;
        bestMatchLength = 0;
      }
    } else if (relativePath.startsWith(`${pkgRelativePath}/`) || relativePath === pkgRelativePath) {
      const matchLength = pkgRelativePath.length;
      if (matchLength > bestMatchLength) {
        bestMatch = pkg;
        bestMatchLength = matchLength;
      }
    }
  }

  return bestMatch;
}
