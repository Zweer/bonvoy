import { writeFile } from 'node:fs/promises';

import { z } from 'zod';

import { BonvoyConfigSchema } from './schema.js';

export async function generateSchema(outputPath: string): Promise<void> {
  // Generate JSON Schema from Zod schema using z.toJSONSchema
  const schema = z.toJSONSchema(BonvoyConfigSchema) as Record<string, unknown>;

  // Add metadata
  schema.$id = 'https://bonvoy.dev/schema.json';
  schema.title = 'bonvoy Configuration';
  schema.description = 'Configuration schema for bonvoy release automation tool';

  // Write schema file
  await writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`);
}
