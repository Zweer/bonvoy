import { describe, expect, it, vi } from 'vitest';

import { createProgram } from '../src/cli.js';

// Mock fs to provide package.json
vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (path.includes('packages/cli/package.json')) {
      return JSON.stringify({ name: '@bonvoy/cli', version: '0.0.0' });
    }
    return JSON.stringify({ name: 'test', version: '0.0.0' });
  }),
}));

describe('@bonvoy/cli', () => {
  it('should create program with correct name and version', () => {
    const program = createProgram();
    expect(program.name()).toBe('bonvoy');
    expect(program.version()).toBe('0.0.0');
  });

  it('should have shipit command', () => {
    const program = createProgram();
    const shipitCmd = program.commands.find((cmd) => cmd.name() === 'shipit');
    expect(shipitCmd).toBeDefined();
    expect(shipitCmd?.description()).toBe('Release all changed packages');
  });

  it('should have all main commands', () => {
    const program = createProgram();
    const commandNames = program.commands
      .map((cmd) => cmd.name())
      .filter((name) => name !== 'help');
    expect(commandNames).toEqual(['shipit', 'prepare', 'status', 'changelog', 'rollback']);
  });

  it('shipit command should have --json option', () => {
    const program = createProgram();
    const shipitCmd = program.commands.find((cmd) => cmd.name() === 'shipit');
    const options = shipitCmd?.options.map((opt) => opt.long);
    expect(options).toContain('--json');
  });
});
