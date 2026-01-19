import type { CommitInfo, Package, SemverBump } from '@bonvoy/core';

export interface ShipitOptions {
  dryRun?: boolean;
  package?: string[];
  cwd?: string;
}

export interface ShipitResult {
  packages: Package[];
  changedPackages: Package[];
  versions: Record<string, string>;
  bumps: Record<string, SemverBump>;
  changelogs: Record<string, string>;
  commits: CommitInfo[];
}
