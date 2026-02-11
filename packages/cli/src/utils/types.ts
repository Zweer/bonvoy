import type { BonvoyConfig, BonvoyPlugin, CommitInfo, Logger, Package } from '@bonvoy/core';
import type { GitOperations } from '@bonvoy/plugin-git';

export interface ShipitOptions {
  dryRun?: boolean;
  silent?: boolean; // Suppress console output (for JSON mode)
  verbose?: boolean; // Show debug output
  quiet?: boolean; // Only show warnings and errors
  package?: string[];
  preid?: string; // Prerelease identifier (alpha, beta, rc)
  force?: boolean; // Skip stale release log check
  cwd?: string;
  plugins?: BonvoyPlugin[];
  gitOps?: GitOperations;
  packages?: Package[]; // Allow injecting packages directly (for testing)
  config?: BonvoyConfig; // Allow injecting config directly (for testing)
  logger?: Logger; // Custom logger (for testing or programmatic usage)
}

export interface ShipitResult {
  packages: Package[];
  changedPackages: Package[];
  versions: Record<string, string>;
  bumps: Record<string, string>;
  changelogs: Record<string, string>;
  commits: CommitInfo[];
}
