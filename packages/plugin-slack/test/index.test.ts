import { describe, expect, it } from 'vitest';

import SlackPlugin, { buildSlackPayload, defaultSlackOperations } from '../src/index.js';

describe('@bonvoy/plugin-slack', () => {
  it('should export SlackPlugin as default', () => {
    expect(SlackPlugin).toBeDefined();
  });

  it('should export buildSlackPayload', () => {
    expect(buildSlackPayload).toBeDefined();
  });

  it('should export defaultSlackOperations', () => {
    expect(defaultSlackOperations).toBeDefined();
  });
});
