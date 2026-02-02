import { describe, expect, it } from 'vitest';

import { buildTeamsCard, defaultTeamsOperations, TeamsPlugin } from '../src/index.js';

describe('index exports', () => {
  it('should export TeamsPlugin', () => {
    expect(TeamsPlugin).toBeDefined();
  });

  it('should export buildTeamsCard', () => {
    expect(buildTeamsCard).toBeDefined();
  });

  it('should export defaultTeamsOperations', () => {
    expect(defaultTeamsOperations).toBeDefined();
  });
});
