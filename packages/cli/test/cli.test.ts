import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram } from '../src/cli.js';

// Mock the core module
vi.mock('@bonvoy/core', () => ({
  Bonvoy: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
}));

describe('@bonvoy/cli', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    exitSpy.mockRestore();
  });

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
    expect(commandNames).toEqual(['shipit', 'prepare', 'status', 'changelog']);
  });

  it('should execute shipit with dry-run', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit', '--dry-run']);

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
    expect(consoleSpy).toHaveBeenCalledWith('Dry run: Yes');
    expect(consoleSpy).toHaveBeenCalledWith('✅ Configuration loaded');
    expect(consoleSpy).toHaveBeenCalledWith('✅ Hook system initialized');
    expect(consoleSpy).toHaveBeenCalledWith('🔍 Dry run completed - no changes made');
  });

  it('should execute shipit with package filter', async () => {
    const program = createProgram();

    await program.parseAsync([
      'node',
      'bonvoy',
      'shipit',
      '--package',
      'test-pkg',
      '--package',
      'other-pkg',
    ]);

    expect(consoleSpy).toHaveBeenCalledWith('Packages: test-pkg, other-pkg');
  });

  it('should execute shipit with version bump', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit', 'minor']);

    expect(consoleSpy).toHaveBeenCalledWith('Bump: minor');
  });

  it('should execute shipit without dry-run', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit']);

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
    expect(consoleSpy).toHaveBeenCalledWith('Dry run: No');
    expect(consoleSpy).toHaveBeenCalledWith('🎉 Release completed successfully!');
  });

  it('should execute prepare command', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'prepare']);

    expect(consoleSpy).toHaveBeenCalledWith('🔄 Creating release PR...');
    expect(consoleSpy).toHaveBeenCalledWith('Not implemented yet');
  });

  it('should execute status command', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'status']);

    expect(consoleSpy).toHaveBeenCalledWith('📊 Checking status...');
    expect(consoleSpy).toHaveBeenCalledWith('Not implemented yet');
  });

  it('should execute changelog command', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'changelog']);

    expect(consoleSpy).toHaveBeenCalledWith('📝 Generating changelog preview...');
    expect(consoleSpy).toHaveBeenCalledWith('Not implemented yet');
  });

  it('should handle shipit errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock loadConfig to throw an error
    const { loadConfig } = await import('@bonvoy/core');
    vi.mocked(loadConfig).mockRejectedValueOnce(new Error('Config error'));

    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit']);

    expect(errorSpy).toHaveBeenCalledWith('❌ Release failed:', 'Config error');
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
  });

  it('should handle non-Error exceptions', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock loadConfig to throw a non-Error
    const { loadConfig } = await import('@bonvoy/core');
    vi.mocked(loadConfig).mockRejectedValueOnce('String error');

    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit']);

    expect(errorSpy).toHaveBeenCalledWith('❌ Release failed:', 'String error');
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
  });
});
