import type { BonvoyPlugin, Context } from '@bonvoy/core';

import {
  type ChangesetOperations,
  defaultChangesetOperations,
  deleteChangesetFiles,
  mergeChangesets,
  readChangesetFiles,
} from './operations.js';

export interface ChangesetPluginConfig {
  deleteAfterRelease?: boolean;
}

export default class ChangesetPlugin implements BonvoyPlugin {
  name = 'changeset';

  private config: Required<ChangesetPluginConfig>;
  private ops: ChangesetOperations;
  private merged: Map<string, { bump: string; notes: string[] }> | null = null;
  private files: ReturnType<typeof readChangesetFiles> = [];

  constructor(config: ChangesetPluginConfig = {}, ops?: ChangesetOperations) {
    this.config = {
      deleteAfterRelease: config.deleteAfterRelease ?? true,
    };
    this.ops = ops ?? defaultChangesetOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types vary by implementation
  apply(bonvoy: { hooks: Record<string, any>; plugins: Array<{ name: string }> }): void {
    // Check for conflicting conventional plugin
    if (bonvoy.plugins.some((p) => p.name === 'conventional')) {
      throw new Error(
        'plugin-changeset and plugin-conventional cannot be used together. Remove one of them from your configuration.',
      );
    }

    // Read and parse changeset files early
    bonvoy.hooks.beforeShipIt.tapPromise(this.name, async (context: Context) => {
      this.files = readChangesetFiles(context.rootPath, this.ops);
      this.merged = mergeChangesets(this.files);

      if (this.merged.size === 0) {
        context.logger.info('📦 No changeset files found');
      } else {
        context.logger.info(`📦 Found ${this.files.length} changeset file(s)`);
      }
    });

    // Provide version bump from changeset
    bonvoy.hooks.getVersion.tap(this.name, (context: Context) => {
      if (!this.merged || !context.currentPackage) return 'none';

      const entry = this.merged.get(context.currentPackage.name);
      if (!entry) return 'none';

      // Return bump type or explicit version
      return entry.bump;
    });

    // Provide changelog notes from changeset
    bonvoy.hooks.generateChangelog.tap(this.name, (context: Context) => {
      if (!this.merged || !context.currentPackage) return '';

      const entry = this.merged.get(context.currentPackage.name);
      if (!entry || entry.notes.length === 0) return '';

      return entry.notes.join('\n\n');
    });

    // Delete changeset files after release
    bonvoy.hooks.afterRelease.tapPromise(this.name, async (context: Context) => {
      if (this.config.deleteAfterRelease && !context.isDryRun && this.files.length > 0) {
        context.logger.info('🗑️  Deleting changeset files...');
        deleteChangesetFiles(this.files, this.ops);
      }
    });
  }
}

export {
  type ChangesetFile,
  type ChangesetOperations,
  defaultChangesetOperations,
  isBumpType,
} from './operations.js';
