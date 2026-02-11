import { describe, expect, it } from 'vitest';

import { resolveLogLevel } from '../src/commands/shipit.js';

describe('resolveLogLevel', () => {
  it('returns silent when silent is true', () => {
    expect(resolveLogLevel({ silent: true })).toBe('silent');
  });

  it('returns debug when verbose is true', () => {
    expect(resolveLogLevel({ verbose: true })).toBe('debug');
  });

  it('returns warn when quiet is true', () => {
    expect(resolveLogLevel({ quiet: true })).toBe('warn');
  });

  it('returns info by default', () => {
    expect(resolveLogLevel({})).toBe('info');
  });

  it('silent takes priority over verbose', () => {
    expect(resolveLogLevel({ silent: true, verbose: true })).toBe('silent');
  });
});
