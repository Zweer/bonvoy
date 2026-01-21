import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Package } from '@bonvoy/core';
import { execa } from 'execa';

export async function detectPackages(rootPath: string): Promise<Package[]> {
  const rootPkgPath = join(rootPath, 'package.json');
  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));

  const packages: Package[] = [];

  // Check if it's a workspace
  if (rootPkg.workspaces) {
    const { stdout } = await execa('npm', ['query', '.workspace'], { cwd: rootPath });
    const workspaces = JSON.parse(stdout);

    for (const ws of workspaces) {
      packages.push({
        name: ws.name,
        version: ws.version,
        path: join(rootPath, ws.location),
        private: ws.private,
        dependencies: ws.dependencies,
        devDependencies: ws.devDependencies,
      });
    }
  } else {
    // Single package
    packages.push({
      name: rootPkg.name,
      version: rootPkg.version,
      path: rootPath,
      private: rootPkg.private,
      dependencies: rootPkg.dependencies,
      devDependencies: rootPkg.devDependencies,
    });
  }

  return packages;
}
