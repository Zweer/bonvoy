import { describe, expect, it } from 'vitest';

import {
  formatChangelog,
  formatMessage,
  formatPackageList,
  NotificationPlugin,
} from '../src/index.js';

describe('@bonvoy/plugin-notification', () => {
  it('should export NotificationPlugin', () => {
    expect(NotificationPlugin).toBeDefined();
  });

  it('should export formatMessage', () => {
    expect(formatMessage).toBeDefined();
  });

  it('should export formatPackageList', () => {
    expect(formatPackageList).toBeDefined();
  });

  it('should export formatChangelog', () => {
    expect(formatChangelog).toBeDefined();
  });
});
