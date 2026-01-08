import type { Hook } from 'tapable';

export interface WorkspaceProvider {
  name: string;
  detectPackages(rootPath: string): Promise<Package[]>;
}

export interface BonvoyConfig {
  /**
   * Versioning strategy for packages
   * @default "independent"
   * @example "independent"
   */
  versioning?: 'independent' | 'fixed';

  /**
   * Strategy for root package versioning
   * @default "max"
   * @example "max"
   */
  rootVersionStrategy?: 'max' | 'patch' | 'none';

  /**
   * Git commit message template
   * @default "chore: release {packages}"
   * @example "chore: release {packages}"
   */
  commitMessage?: string;

  /**
   * Git tag format template
   * @default "{name}@{version}"
   * @example "{name}@{version}"
   */
  tagFormat?: string;

  /**
   * Changelog configuration
   */
  changelog?: {
    /**
     * Generate global changelog at repo root
     * @default false
     */
    global?: boolean;

    /**
     * Changelog section mappings
     */
    sections?: Record<string, string>;
  };

  /**
   * Release workflow type
   * @default "direct"
   * @example "direct"
   */
  workflow?: 'direct' | 'pr';

  /**
   * Base branch for releases
   * @default "main"
   * @example "main"
   */
  baseBranch?: string;

  /**
   * Plugin configuration
   * @default []
   * @example ["@bonvoy/plugin-slack"]
   */
  plugins?: (string | [string, object])[];

  /**
   * Custom hook implementations
   */
  hooks?: Partial<ReleaseHooks>;
}

export interface Package {
  name: string;
  version: string;
  path: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface Context {
  config: BonvoyConfig;
  packages: Package[];
  changedPackages: Package[];
  rootPath: string;
  isDryRun: boolean;
}

export interface VersionContext extends Context {
  versions: Record<string, string>;
  bumps: Record<string, SemverBump>;
}

export interface ChangelogContext extends VersionContext {
  commits: CommitInfo[];
  changelogs: Record<string, string>;
}

export interface PublishContext extends ChangelogContext {
  publishedPackages: string[];
}

export interface ReleaseContext extends PublishContext {
  releases: Record<string, ReleaseInfo>;
}

export interface PRContext extends Context {
  prUrl?: string;
  prNumber?: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
  packages: string[];
  type?: string;
  scope?: string;
  breaking?: boolean;
}

export interface ReleaseInfo {
  tag: string;
  url: string;
  changelog: string;
}

export type SemverBump = 'patch' | 'minor' | 'major' | 'prerelease' | 'none';

export interface BonvoyPlugin {
  name: string;
  apply(bonvoy: import('./bonvoy.js').Bonvoy): void;
}

export interface ReleaseHooks {
  // Configuration phase
  modifyConfig: Hook<[BonvoyConfig], BonvoyConfig>;

  // Validation phase
  beforeShipIt: Hook<[Context], void>;
  validateRepo: Hook<[Context], void>;

  // Version phase
  getVersion: Hook<[Context], SemverBump>;
  version: Hook<[VersionContext], void>;
  afterVersion: Hook<[VersionContext], void>;

  // Changelog phase
  beforeChangelog: Hook<[ChangelogContext], void>;
  generateChangelog: Hook<[ChangelogContext], string>;
  afterChangelog: Hook<[ChangelogContext], void>;

  // Publish phase
  beforePublish: Hook<[PublishContext], void>;
  publish: Hook<[PublishContext], void>;
  afterPublish: Hook<[PublishContext], void>;

  // Release phase
  beforeRelease: Hook<[ReleaseContext], void>;
  makeRelease: Hook<[ReleaseContext], void>;
  afterRelease: Hook<[ReleaseContext], void>;

  // PR workflow
  beforeCreatePR: Hook<[PRContext], void>;
  createPR: Hook<[PRContext], void>;
  afterCreatePR: Hook<[PRContext], void>;
}

// Re-export tapable types
export type { Hook } from 'tapable';
