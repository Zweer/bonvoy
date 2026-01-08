import { AsyncSeriesHook, AsyncSeriesWaterfallHook } from 'tapable';

import type { BonvoyConfig, BonvoyPlugin, ReleaseHooks } from './schema.js';

export class Bonvoy {
  public hooks: ReleaseHooks;
  public config: BonvoyConfig;
  public plugins: BonvoyPlugin[] = [];

  constructor(config: BonvoyConfig = {}) {
    this.config = config;
    this.hooks = {
      // Configuration phase
      modifyConfig: new AsyncSeriesWaterfallHook(['config']),

      // Validation phase
      beforeShipIt: new AsyncSeriesHook(['context']),
      validateRepo: new AsyncSeriesHook(['context']),

      // Version phase
      getVersion: new AsyncSeriesWaterfallHook(['context']),
      version: new AsyncSeriesHook(['versionContext']),
      afterVersion: new AsyncSeriesHook(['versionContext']),

      // Changelog phase
      beforeChangelog: new AsyncSeriesHook(['changelogContext']),
      generateChangelog: new AsyncSeriesWaterfallHook(['changelogContext']),
      afterChangelog: new AsyncSeriesHook(['changelogContext']),

      // Publish phase
      beforePublish: new AsyncSeriesHook(['publishContext']),
      publish: new AsyncSeriesHook(['publishContext']),
      afterPublish: new AsyncSeriesHook(['publishContext']),

      // Release phase
      beforeRelease: new AsyncSeriesHook(['releaseContext']),
      makeRelease: new AsyncSeriesHook(['releaseContext']),
      afterRelease: new AsyncSeriesHook(['releaseContext']),

      // PR workflow
      beforeCreatePR: new AsyncSeriesHook(['prContext']),
      createPR: new AsyncSeriesHook(['prContext']),
      afterCreatePR: new AsyncSeriesHook(['prContext']),
    };
  }

  use(plugin: BonvoyPlugin): void {
    this.plugins.push(plugin);
    plugin.apply(this);
  }
}
