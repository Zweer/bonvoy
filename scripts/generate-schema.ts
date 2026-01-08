import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import * as TJS from 'typescript-json-schema';

// Generate JSON Schema from TypeScript interface
const program = TJS.getProgramFromFiles([resolve('./packages/core/src/types.ts')]);

const schema = TJS.generateSchema(program, 'BonvoyConfig', {
  required: true,
  noExtraProps: false,
  propOrder: false,
  titles: true,
  descriptions: true,
  defaultProps: true,
  examples: true,
});

if (schema) {
  // Add metadata
  schema.$id = 'https://bonvoy.dev/schema.json';
  schema.title = 'bonvoy Configuration';
  schema.description = 'Configuration schema for bonvoy release automation tool';

  // Write schema file
  await writeFile('./packages/core/schema.json', JSON.stringify(schema, null, 2));

  console.log('✅ JSON Schema generated: packages/core/schema.json');
} else {
  console.error('❌ Failed to generate schema');
}
