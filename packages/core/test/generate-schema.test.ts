import { existsSync, readFileSync, unlinkSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { generateSchema } from '../src/generate-schema.js';

describe('generateSchema', () => {
  const testSchemaPath = './test-schema.json';

  afterEach(() => {
    // Clean up test file
    if (existsSync(testSchemaPath)) {
      unlinkSync(testSchemaPath);
    }
  });

  it('should generate valid JSON schema file', async () => {
    await generateSchema(testSchemaPath);

    // Check that file was created
    expect(existsSync(testSchemaPath)).toBe(true);

    // Check file content
    const content = readFileSync(testSchemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // Check schema structure
    expect(schema).toHaveProperty('$id', 'https://bonvoy.dev/schema.json');
    expect(schema).toHaveProperty('title', 'bonvoy Configuration');
    expect(schema).toHaveProperty(
      'description',
      'Configuration schema for bonvoy release automation tool',
    );
    expect(schema).toHaveProperty('$ref', '#/definitions/BonvoyConfig');
    expect(schema).toHaveProperty('definitions');
    expect(schema.definitions).toHaveProperty('BonvoyConfig');
  });

  it('should generate valid JSON that can be parsed', async () => {
    await generateSchema(testSchemaPath);

    const content = readFileSync(testSchemaPath, 'utf-8');

    // Should not throw
    expect(() => JSON.parse(content)).not.toThrow();
  });
});
