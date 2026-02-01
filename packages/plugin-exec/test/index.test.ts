import { describe, expect, it } from 'vitest';

import ExecPlugin, { defaultExecOperations } from '../src/index.js';

describe('plugin-exec exports', () => {
  it('should export ExecPlugin as default', () => {
    expect(ExecPlugin).toBeDefined();
    expect(new ExecPlugin().name).toBe('exec');
  });

  it('should export defaultExecOperations', () => {
    expect(defaultExecOperations).toBeDefined();
    expect(defaultExecOperations.exec).toBeInstanceOf(Function);
  });
});
