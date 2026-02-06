import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BonvoyConfigSchema } from '../src/schema.js';

describe('schema generation', () => {
  it('should generate valid JSON schema from Zod schema', () => {
    const schema = z.toJSONSchema(BonvoyConfigSchema);

    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties?.versioning).toBeDefined();
  });

  it('should include schema metadata', () => {
    const schema = z.toJSONSchema(BonvoyConfigSchema);

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.type).toBe('object');
  });

  it('should validate correct config', () => {
    const validConfig = {
      versioning: 'fixed',
      commitMessage: 'release: v{version}',
    };

    const result = BonvoyConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid config', () => {
    const invalidConfig = {
      versioning: 'invalid',
      commitMessage: 123,
    };

    const result = BonvoyConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should apply defaults for empty config', () => {
    const result = BonvoyConfigSchema.parse({});

    expect(result).toHaveProperty('versioning', 'independent');
    expect(result).toHaveProperty('commitMessage', 'chore: release {packages}');
    expect(result).toHaveProperty('changelog.global', false);
    expect(result).toHaveProperty('changelog.sections.feat', '✨ Features');
  });

  it('should include conventional sub-config with defaults', () => {
    const result = BonvoyConfigSchema.parse({});

    expect(result).toHaveProperty('conventional.preset', 'angular');
  });

  it('should include git sub-config with defaults', () => {
    const result = BonvoyConfigSchema.parse({});

    expect(result).toHaveProperty('git.push', true);
  });

  it('should include npm sub-config with defaults', () => {
    const result = BonvoyConfigSchema.parse({});

    expect(result).toHaveProperty('npm.registry', 'https://registry.npmjs.org');
    expect(result).toHaveProperty('npm.access', 'public');
    expect(result).toHaveProperty('npm.provenance', true);
    expect(result).toHaveProperty('npm.skipExisting', true);
  });

  it('should include gitlab sub-config with defaults', () => {
    const result = BonvoyConfigSchema.parse({});

    expect(result).toHaveProperty('gitlab');
  });

  it('should accept custom conventional config', () => {
    const result = BonvoyConfigSchema.parse({
      conventional: { preset: 'atom', types: { feat: 'minor' } },
    });

    expect(result.conventional.preset).toBe('atom');
    expect(result.conventional.types).toEqual({ feat: 'minor' });
  });

  it('should accept custom git config', () => {
    const result = BonvoyConfigSchema.parse({
      git: { push: false, commitMessage: 'custom: {packages}' },
    });

    expect(result.git.push).toBe(false);
    expect(result.git.commitMessage).toBe('custom: {packages}');
  });

  it('should accept custom npm config', () => {
    const result = BonvoyConfigSchema.parse({
      npm: { registry: 'https://custom.registry.com', access: 'restricted' },
    });

    expect(result.npm.registry).toBe('https://custom.registry.com');
    expect(result.npm.access).toBe('restricted');
  });

  it('should accept custom gitlab config', () => {
    const result = BonvoyConfigSchema.parse({
      gitlab: { host: 'https://gitlab.example.com', projectId: 42 },
    });

    expect(result.gitlab.host).toBe('https://gitlab.example.com');
    expect(result.gitlab.projectId).toBe(42);
  });
});
