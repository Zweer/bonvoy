import { relative, resolve } from 'node:path';

import type { CommitInfo, Package } from './schema.js';

export function assignCommitsToPackages(
  commits: CommitInfo[],
  packages: Package[],
  rootPath: string,
): CommitInfo[] {
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

  // If file is outside rootPath, return null
  if (relativePath.startsWith('..')) {
    return null;
  }

  // Find the package that contains this file path
  let bestMatch: Package | null = null;
  let bestMatchLength = -1;

  for (const pkg of packages) {
    const pkgRelativePath = relative(rootPath, pkg.path);

    // Handle root package (empty relative path)
    if (pkgRelativePath === '' || pkgRelativePath === '.') {
      // Root package matches all files that don't belong to a workspace package
      if (bestMatchLength < 0) {
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
