import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { ActionEntry, ActionLogHelper, ReleaseLog } from './schema.js';

export class ActionLog implements ActionLogHelper {
  private actions: ActionEntry[] = [];
  private log: ReleaseLog;
  private filePath: string;

  constructor(filePath: string, config: ReleaseLog['config'], packages: ReleaseLog['packages']) {
    this.filePath = filePath;
    this.log = {
      startedAt: new Date().toISOString(),
      config,
      packages,
      actions: [],
      status: 'in-progress',
    };
    this.flush();
  }

  record(entry: Omit<ActionEntry, 'timestamp' | 'status'>): void {
    const action: ActionEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };
    this.actions.push(action);
    this.log.actions = this.actions;
    this.flush();
  }

  entries(): ActionEntry[] {
    return [...this.actions];
  }

  complete(): void {
    this.log.status = 'completed';
    this.flush();
  }

  markRolledBack(): void {
    this.log.status = 'rolled-back';
    this.flush();
  }

  markRollbackFailed(): void {
    this.log.status = 'rollback-failed';
    this.flush();
  }

  private flush(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(this.log, null, 2)}\n`);
  }

  static load(filePath: string): ReleaseLog {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }
}

/** No-op action log for dry-run and contexts that don't need logging */
export const noopActionLog: ActionLogHelper = {
  record() {},
  entries() {
    return [];
  },
};
