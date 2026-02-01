import type { BonvoyPlugin, Context, PublishContext } from '@bonvoy/core';

import { defaultNpmOperations, type NpmOperations } from './operations.js';

export interface NpmPluginConfig {
  registry?: string;
  access?: 'public' | 'restricted';
  dryRun?: boolean;
  skipExisting?: boolean;
  provenance?: boolean;
}

export default class NpmPlugin implements BonvoyPlugin {
  name = 'npm';

  private config: Required<NpmPluginConfig>;
  private ops: NpmOperations;

  constructor(config: NpmPluginConfig = {}, ops?: NpmOperations) {
    this.config = {
      registry: config.registry ?? 'https://registry.npmjs.org',
      access: config.access ?? 'public',
      dryRun: config.dryRun ?? false,
      skipExisting: config.skipExisting ?? true,
      provenance: config.provenance ?? true,
    };
    this.ops = ops ?? defaultNpmOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types are complex and vary by implementation
  apply(bonvoy: { hooks: { validateRepo: any; publish: any } }): void {
    bonvoy.hooks.validateRepo.tapPromise(this.name, async (context: Context) => {
      await this.validatePackages(context);
    });

    bonvoy.hooks.publish.tapPromise(this.name, async (context: PublishContext) => {
      if (context.isDryRun) {
        context.logger.info('🔍 [dry-run] Would publish packages to npm');
        return;
      }
      await this.publishPackages(context);
    });
  }

  private async publishPackages(context: PublishContext): Promise<void> {
    const { packages, logger } = context;

    for (const pkg of packages) {
      if (this.config.skipExisting && (await this.isAlreadyPublished(pkg))) {
        logger.info(`Skipping ${pkg.name}@${pkg.version} - already published`);
        continue;
      }

      await this.publishPackage(pkg, logger);
    }
  }

  private async publishPackage(
    pkg: { name: string; version: string; path: string },
    logger: PublishContext['logger'],
  ): Promise<void> {
    const args: string[] = [];

    if (this.config.dryRun) {
      args.push('--dry-run');
    }

    args.push('--access', this.config.access);

    if (this.config.provenance) {
      args.push('--provenance');
    }

    if (this.config.registry !== 'https://registry.npmjs.org') {
      args.push('--registry', this.config.registry);
    }

    logger.info(`Publishing ${pkg.name}@${pkg.version}...`);

    await this.ops.publish(args, pkg.path);
  }

  private async isAlreadyPublished(pkg: { name: string; version: string }): Promise<boolean> {
    const version = await this.ops.view(pkg.name, pkg.version);
    return version === pkg.version;
  }

  private async validatePackages(context: Context): Promise<void> {
    const { changedPackages, versions, logger } = context;
    if (!versions) return;

    const alreadyPublished: string[] = [];
    const needsToken: string[] = [];
    const hasToken = await this.ops.hasToken();

    for (const pkg of changedPackages) {
      const version = versions[pkg.name];
      if (!version) continue;

      // Check if version already exists
      const existingVersion = await this.ops.view(pkg.name, version);
      if (existingVersion === version) {
        alreadyPublished.push(`${pkg.name}@${version}`);
        continue;
      }

      // Check if package exists (for OIDC)
      if (!hasToken && this.config.provenance) {
        const exists = await this.ops.packageExists(pkg.name);
        if (!exists) {
          needsToken.push(pkg.name);
        }
      }
    }

    if (alreadyPublished.length > 0) {
      logger.error(`❌ npm versions already published: ${alreadyPublished.join(', ')}`);
      throw new Error(
        `Cannot release: npm versions already exist (${alreadyPublished.join(', ')}). Bump to a new version.`,
      );
    }

    if (needsToken.length > 0) {
      logger.error(`❌ First publish requires NPM_TOKEN: ${needsToken.join(', ')}`);
      throw new Error(
        `Cannot release with OIDC: packages don't exist on npm yet (${needsToken.join(', ')}). First publish requires NPM_TOKEN. Run: node scripts/publish-dummy-packages.mjs`,
      );
    }
  }
}

export { defaultNpmOperations, type NpmOperations } from './operations.js';
