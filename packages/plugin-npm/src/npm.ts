import type { BonvoyPlugin, PublishContext } from '@bonvoy/core';
import { execa } from 'execa';

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

  constructor(config: NpmPluginConfig = {}) {
    this.config = {
      registry: config.registry ?? 'https://registry.npmjs.org',
      access: config.access ?? 'public',
      dryRun: config.dryRun ?? false,
      skipExisting: config.skipExisting ?? true,
      provenance: config.provenance ?? true,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types are complex and vary by implementation
  apply(bonvoy: { hooks: { publish: any } }): void {
    bonvoy.hooks.publish.tapPromise(this.name, async (context: PublishContext) => {
      await this.publishPackages(context);
    });
  }

  private async publishPackages(context: PublishContext): Promise<void> {
    const { packages } = context;

    for (const pkg of packages) {
      if (this.config.skipExisting && (await this.isAlreadyPublished(pkg))) {
        console.log(`Skipping ${pkg.name}@${pkg.version} - already published`);
        continue;
      }

      await this.publishPackage(pkg);
    }
  }

  private async publishPackage(pkg: {
    name: string;
    version: string;
    path: string;
  }): Promise<void> {
    const args = ['publish'];

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

    console.log(`Publishing ${pkg.name}@${pkg.version}...`);

    await execa('npm', args, {
      cwd: pkg.path,
      stdio: 'inherit',
    });
  }

  private async isAlreadyPublished(pkg: { name: string; version: string }): Promise<boolean> {
    try {
      const result = await execa('npm', ['view', `${pkg.name}@${pkg.version}`, 'version'], {
        stdio: 'pipe',
      });
      return result.stdout.trim() === pkg.version;
    } catch {
      return false;
    }
  }
}
