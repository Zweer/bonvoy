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
});
