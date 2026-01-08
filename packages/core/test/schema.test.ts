import { describe, expect, it } from 'vitest';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { BonvoyConfigSchema } from '../src/schema.js';

describe('schema generation', () => {
  it('should generate valid JSON schema from Zod schema', () => {
    const schema = zodToJsonSchema(BonvoyConfigSchema as never, 'BonvoyConfig');

    expect(schema).toBeDefined();
    expect('$ref' in schema ? schema.$ref : undefined).toBe('#/definitions/BonvoyConfig');
    expect(schema.definitions).toBeDefined();
    expect(schema.definitions?.BonvoyConfig).toBeDefined();
  });

  it('should include schema metadata', () => {
    const schema = zodToJsonSchema(BonvoyConfigSchema as never, 'BonvoyConfig');

    expect('$schema' in schema ? schema.$schema : undefined).toBe(
      'http://json-schema.org/draft-07/schema#',
    );
    expect(schema.definitions).toBeDefined();
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
