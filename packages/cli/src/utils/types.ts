import type { BonvoyConfig, BonvoyPlugin, CommitInfo, Package } from '@bonvoy/core';
import type { GitOperations } from '@bonvoy/plugin-git';

export interface ShipitOptions {
  dryRun?: boolean;
  package?: string[];
  cwd?: string;
  plugins?: BonvoyPlugin[];
  gitOps?: GitOperations;
  packages?: Package[]; // Allow injecting packages directly (for testing)
  config?: BonvoyConfig; // Allow injecting config directly (for testing)
}

export interface ShipitResult {
  packages: Package[];
  changedPackages: Package[];
  versions: Record<string, string>;
  bumps: Record<string, string>;
  changelogs: Record<string, string>;
  commits: CommitInfo[];
}
