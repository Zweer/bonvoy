import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createProgram } from '../src/cli.js';

// Mock all dependencies
vi.mock('@bonvoy/core', () => ({
  Bonvoy: vi.fn().mockImplementation(function (this: {
    use: ReturnType<typeof vi.fn>;
    hooks: Record<string, { promise: ReturnType<typeof vi.fn> }>;
  }) {
    this.use = vi.fn();
    this.hooks = {
      getVersion: { promise: vi.fn().mockResolvedValue('none') },
      beforeChangelog: { promise: vi.fn() },
      generateChangelog: { promise: vi.fn() },
      afterChangelog: { promise: vi.fn() },
      beforePublish: { promise: vi.fn() },
      publish: { promise: vi.fn() },
      afterPublish: { promise: vi.fn() },
    };
  }),
  loadConfig: vi.fn().mockResolvedValue({}),
  assignCommitsToPackages: vi.fn().mockReturnValue([]),
}));

vi.mock('@bonvoy/plugin-conventional', () => ({
  default: vi.fn(),
}));

vi.mock('@bonvoy/plugin-changelog', () => ({
  default: vi.fn(),
}));

vi.mock('@bonvoy/plugin-git', () => ({
  default: vi.fn(),
}));

vi.mock('@bonvoy/plugin-npm', () => ({
  default: vi.fn(),
}));

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '[]' }),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (path.includes('packages/cli/package.json')) {
      return JSON.stringify({ name: '@bonvoy/cli', version: '0.0.0' });
    }
    return JSON.stringify({ name: 'test', version: '0.0.0' });
  }),
}));

// Mock shipit to return controlled results
vi.mock('../src/cli.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/cli.js')>();
  return {
    ...actual,
    shipit: vi.fn().mockResolvedValue({
      packages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      changedPackages: [{ name: 'test-pkg', version: '1.0.0', path: '/test' }],
      versions: { 'test-pkg': '1.1.0' },
      bumps: { 'test-pkg': 'minor' },
      changelogs: {},
      commits: [],
    }),
  };
});

describe('@bonvoy/cli', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.clearAllMocks();
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
    expect(consoleSpy).toHaveBeenCalledWith('🔍 Dry run mode enabled');
    expect(consoleSpy).toHaveBeenCalledWith('✅ Configuration loaded');
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

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
  });

  it('should execute shipit with version bump', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit', 'minor']);

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
  });

  it('should execute shipit without dry-run', async () => {
    const program = createProgram();

    await program.parseAsync(['node', 'bonvoy', 'shipit']);

    expect(consoleSpy).toHaveBeenCalledWith('🚢 Starting bonvoy release...');
    expect(consoleSpy).toHaveBeenCalledWith('✅ Configuration loaded');
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
