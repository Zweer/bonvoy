import { z } from 'zod';

export const BonvoyConfigSchema = z
  .object({
    versioning: z.enum(['independent', 'fixed']).default('independent'),
    rootVersionStrategy: z.enum(['max', 'patch', 'none']).default('max'),
    commitMessage: z.string().default('chore: release {packages}'),
    tagFormat: z.string().default('{name}@{version}'),
    changelog: z
      .object({
        global: z.boolean().default(false),
        sections: z.record(z.string(), z.string()).default({
          feat: '✨ Features',
          fix: '🐛 Bug Fixes',
          perf: '⚡ Performance',
          docs: '📚 Documentation',
          breaking: '💥 Breaking Changes',
        }),
      })
      .default({
        global: false,
        sections: {
          feat: '✨ Features',
          fix: '🐛 Bug Fixes',
          perf: '⚡ Performance',
          docs: '📚 Documentation',
          breaking: '💥 Breaking Changes',
        },
      }),
    workflow: z.enum(['direct', 'pr']).default('direct'),
    baseBranch: z.string().default('main'),
    github: z
      .object({
        token: z.string().optional(),
        owner: z.string().optional(),
        repo: z.string().optional(),
        draft: z.boolean().default(false),
        prerelease: z.boolean().optional(),
      })
      .default({
        draft: false,
      }),
    plugins: z
      .array(
        z.union([z.string(), z.tuple([z.string(), z.record(z.string(), z.unknown())] as const)]),
      )
      .default([]),
  })
  // biome-ignore lint/suspicious/noExplicitAny: Required for TypeScript isolated declarations
  .partial() as z.ZodType<any>;

export type BonvoyConfig = z.infer<typeof BonvoyConfigSchema>;

// Re-export other types that don't need validation
export interface WorkspaceProvider {
  name: string;
  detectPackages(rootPath: string): Promise<Package[]>;
}

export interface Package {
  name: string;
  version: string;
  path: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface Context {
  config: BonvoyConfig;
  packages: Package[];
  changedPackages: Package[];
  rootPath: string;
  isDryRun: boolean;
  logger: Logger;
  commits?: CommitInfo[]; // Commit filtrati per il package corrente
  currentPackage?: Package; // Package che stiamo processando
  versions?: Record<string, string>; // Versioni calcolate (disponibile in validateRepo)
}

export interface VersionContext extends Context {
  versions: Record<string, string>;
  bumps: Record<string, string>;
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
  branchName: string;
  baseBranch: string;
  title: string;
  body: string;
  prUrl?: string;
  prNumber?: number;
}

export interface PRTrackingFile {
  prNumber: number;
  prUrl: string;
  branch: string;
  baseBranch: string;
  createdAt: string;
  packages: string[];
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
  modifyConfig: import('tapable').Hook<[BonvoyConfig], BonvoyConfig>;

  // Validation phase
  beforeShipIt: import('tapable').Hook<[Context], void>;
  validateRepo: import('tapable').Hook<[Context], void>;

  // Version phase
  getVersion: import('tapable').Hook<[Context], SemverBump>;
  version: import('tapable').Hook<[VersionContext], void>;
  afterVersion: import('tapable').Hook<[VersionContext], void>;

  // Changelog phase
  beforeChangelog: import('tapable').Hook<[ChangelogContext], void>;
  generateChangelog: import('tapable').Hook<[ChangelogContext], string>;
  afterChangelog: import('tapable').Hook<[ChangelogContext], void>;

  // Publish phase
  beforePublish: import('tapable').Hook<[PublishContext], void>;
  publish: import('tapable').Hook<[PublishContext], void>;
  afterPublish: import('tapable').Hook<[PublishContext], void>;

  // Release phase
  beforeRelease: import('tapable').Hook<[ReleaseContext], void>;
  makeRelease: import('tapable').Hook<[ReleaseContext], void>;
  afterRelease: import('tapable').Hook<[ReleaseContext], void>;

  // PR workflow
  beforeCreatePR: import('tapable').Hook<[PRContext], void>;
  createPR: import('tapable').Hook<[PRContext], void>;
  afterCreatePR: import('tapable').Hook<[PRContext], void>;
}

// Re-export tapable types
export type { Hook } from 'tapable';
