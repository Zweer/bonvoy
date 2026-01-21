import type { CommitInfo, Package } from '@bonvoy/core';

export interface ShipitOptions {
  dryRun?: boolean;
  package?: string[];
  cwd?: string;
}

export interface ShipitResult {
  packages: Package[];
  changedPackages: Package[];
  versions: Record<string, string>;
  bumps: Record<string, string>;
  changelogs: Record<string, string>;
  commits: CommitInfo[];
}
