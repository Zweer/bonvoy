import { writeFile } from 'node:fs/promises';

import { zodToJsonSchema } from 'zod-to-json-schema';

import { BonvoyConfigSchema } from './schema.js';

export async function generateSchema(outputPath: string): Promise<void> {
  // Generate JSON Schema from Zod schema
  const schema = zodToJsonSchema(BonvoyConfigSchema as never, 'BonvoyConfig') as Record<
    string,
    unknown
  >;

  // Add metadata
  schema.$id = 'https://bonvoy.dev/schema.json';
  schema.title = 'bonvoy Configuration';
  schema.description = 'Configuration schema for bonvoy release automation tool';

  // Write schema file
  await writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`);
}
