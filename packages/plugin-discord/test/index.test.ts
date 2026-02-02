import { describe, expect, it } from 'vitest';

import { buildDiscordPayload, DiscordPlugin, defaultDiscordOperations } from '../src/index.js';

describe('index exports', () => {
  it('should export DiscordPlugin', () => {
    expect(DiscordPlugin).toBeDefined();
  });

  it('should export buildDiscordPayload', () => {
    expect(buildDiscordPayload).toBeDefined();
  });

  it('should export defaultDiscordOperations', () => {
    expect(defaultDiscordOperations).toBeDefined();
  });
});
