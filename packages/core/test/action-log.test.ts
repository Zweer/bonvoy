import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionLog, noopActionLog } from '../src/action-log.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('ActionLog', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should create log file on construction', () => {
    new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [{ name: 'pkg-a', from: '1.0.0', to: '1.1.0' }],
    );

    const log = JSON.parse(
      vol.readFileSync('/project/.bonvoy/release-log.json', 'utf-8') as string,
    );
    expect(log.status).toBe('in-progress');
    expect(log.packages).toEqual([{ name: 'pkg-a', from: '1.0.0', to: '1.1.0' }]);
    expect(log.actions).toEqual([]);
    expect(log.config.tagFormat).toBe('{name}@{version}');
  });

  it('should record actions incrementally', () => {
    const actionLog = new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [],
    );

    actionLog.record({ plugin: 'git', action: 'commit', data: { previousSha: 'abc123' } });
    actionLog.record({ plugin: 'git', action: 'tag', data: { tags: ['v1.0.0'] } });

    const log = JSON.parse(
      vol.readFileSync('/project/.bonvoy/release-log.json', 'utf-8') as string,
    );
    expect(log.actions).toHaveLength(2);
    expect(log.actions[0].plugin).toBe('git');
    expect(log.actions[0].action).toBe('commit');
    expect(log.actions[0].status).toBe('completed');
    expect(log.actions[0].timestamp).toBeDefined();
    expect(log.actions[1].action).toBe('tag');
  });

  it('should return copy of entries', () => {
    const actionLog = new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [],
    );
    actionLog.record({ plugin: 'git', action: 'commit', data: {} });

    const entries = actionLog.entries();
    expect(entries).toHaveLength(1);

    // Should be a copy
    entries.push({ plugin: 'x', action: 'y', data: {}, timestamp: '', status: 'completed' });
    expect(actionLog.entries()).toHaveLength(1);
  });

  it('should mark as completed', () => {
    const actionLog = new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [],
    );
    actionLog.complete();

    const log = JSON.parse(
      vol.readFileSync('/project/.bonvoy/release-log.json', 'utf-8') as string,
    );
    expect(log.status).toBe('completed');
  });

  it('should mark as rolled-back', () => {
    const actionLog = new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [],
    );
    actionLog.markRolledBack();

    const log = JSON.parse(
      vol.readFileSync('/project/.bonvoy/release-log.json', 'utf-8') as string,
    );
    expect(log.status).toBe('rolled-back');
  });

  it('should mark as rollback-failed', () => {
    const actionLog = new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [],
    );
    actionLog.markRollbackFailed();

    const log = JSON.parse(
      vol.readFileSync('/project/.bonvoy/release-log.json', 'utf-8') as string,
    );
    expect(log.status).toBe('rollback-failed');
  });

  it('should load log from file', () => {
    const actionLog = new ActionLog(
      '/project/.bonvoy/release-log.json',
      { tagFormat: '{name}@{version}', rootPath: '/project' },
      [{ name: 'pkg', from: '1.0.0', to: '2.0.0' }],
    );
    actionLog.record({ plugin: 'npm', action: 'publish', data: { name: 'pkg', version: '2.0.0' } });
    actionLog.complete();

    const loaded = ActionLog.load('/project/.bonvoy/release-log.json');
    expect(loaded.status).toBe('completed');
    expect(loaded.actions).toHaveLength(1);
    expect(loaded.packages[0].name).toBe('pkg');
  });
});

describe('noopActionLog', () => {
  it('should not throw on record', () => {
    expect(() => noopActionLog.record({ plugin: 'test', action: 'test', data: {} })).not.toThrow();
  });

  it('should return empty entries', () => {
    expect(noopActionLog.entries()).toEqual([]);
  });
});
