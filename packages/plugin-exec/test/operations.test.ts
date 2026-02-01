import { describe, expect, it } from 'vitest';

import { defaultExecOperations } from '../src/operations.js';

describe('defaultExecOperations', () => {
  it('should execute shell command', async () => {
    await expect(defaultExecOperations.exec('echo test', process.cwd())).resolves.not.toThrow();
  });

  it('should support shell syntax', async () => {
    await expect(
      defaultExecOperations.exec('echo "hello" | cat', process.cwd()),
    ).resolves.not.toThrow();
  });
});
