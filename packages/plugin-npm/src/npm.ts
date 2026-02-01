import type { BonvoyPlugin, PublishContext } from '@bonvoy/core';

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
  apply(bonvoy: { hooks: { publish: any } }): void {
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
}

export { defaultNpmOperations, type NpmOperations } from './operations.js';
