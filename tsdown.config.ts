import { defineConfig } from 'tsdown';

export default defineConfig({
  workspace: true,
  entry: ['src/index.ts'],
  dts: true,
  sourcemap: true,
  exports: true,
  publint: 'ci-only',
  attw: {
    enabled: 'ci-only',
    profile: 'esm-only',
  },
  external: ['execa'],
  outputOptions: {
    banner: (chunk) => {
      // Add shebang only to CLI entry point
      if (chunk.name === 'index' && chunk.facadeModuleId?.includes('packages/cli')) {
        return '#!/usr/bin/env node';
      }
      return '';
    },
  },
});
