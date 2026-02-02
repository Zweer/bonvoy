import { describe, expect, it } from 'vitest';

import { buildTelegramMessage, defaultTelegramOperations, TelegramPlugin } from '../src/index.js';

describe('index exports', () => {
  it('should export TelegramPlugin', () => {
    expect(TelegramPlugin).toBeDefined();
  });

  it('should export buildTelegramMessage', () => {
    expect(buildTelegramMessage).toBeDefined();
  });

  it('should export defaultTelegramOperations', () => {
    expect(defaultTelegramOperations).toBeDefined();
  });
});
