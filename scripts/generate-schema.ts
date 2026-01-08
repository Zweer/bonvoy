import { generateSchema } from '../packages/core/src/generate-schema.js';

// Generate and write schema file
await generateSchema('./packages/core/schema.json');

console.log('✅ JSON Schema generated: packages/core/schema.json');
