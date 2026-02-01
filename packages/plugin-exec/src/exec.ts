import type { BonvoyPlugin, Context } from '@bonvoy/core';

import { defaultExecOperations, type ExecOperations } from './operations.js';

export interface ExecPluginConfig {
  beforeShipIt?: string;
  afterVersion?: string;
  beforeChangelog?: string;
  afterChangelog?: string;
  beforePublish?: string;
  afterPublish?: string;
  beforeRelease?: string;
  afterRelease?: string;
}

type HookName = keyof ExecPluginConfig;

const HOOKS: HookName[] = [
  'beforeShipIt',
  'afterVersion',
  'beforeChangelog',
  'afterChangelog',
  'beforePublish',
  'afterPublish',
  'beforeRelease',
  'afterRelease',
];

export default class ExecPlugin implements BonvoyPlugin {
  name = 'exec';

  private config: ExecPluginConfig;
  private ops: ExecOperations;

  constructor(config: ExecPluginConfig = {}, ops?: ExecOperations) {
    this.config = config;
    this.ops = ops ?? defaultExecOperations;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Hook types vary by implementation
  apply(bonvoy: { hooks: Record<string, any> }): void {
    for (const hook of HOOKS) {
      const command = this.config[hook];
      if (command) {
        bonvoy.hooks[hook].tapPromise(this.name, async (context: Context) => {
          await this.runCommand(command, context);
        });
      }
    }
  }

  private async runCommand(command: string, context: Context): Promise<void> {
    const { isDryRun, rootPath, logger } = context;

    logger.info(`🔧 Executing: ${command}`);

    if (!isDryRun) {
      await this.ops.exec(command, rootPath);
    }
  }
}

export { defaultExecOperations, type ExecOperations } from './operations.js';
