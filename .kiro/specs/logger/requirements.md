# bonvoy Logger

> Structured logging with levels to control output verbosity.

## Problem

Release output is noisy:
- Octokit logs HTTP requests to `console` (e.g., `GET /repos/... - 404 in 163ms`)
- `npm publish` with `stdio: 'inherit'` dumps all `npm notice` lines to stdout
- No way to control verbosity — everything is `info` level

## Solution

A `Logger` with log levels in `@bonvoy/core`. Plugins use `logger.debug()` for internal details. CLI flags control the level.

## Design

### Log Levels

```
debug < info < warn < error < silent
```

| Level | Shows | Use case |
|-------|-------|----------|
| `debug` | everything | `--verbose` flag, troubleshooting |
| `info` | info + warn + error | default |
| `warn` | warn + error | `--quiet` flag |
| `error` | error only | |
| `silent` | nothing | JSON output, tests |

### Interface

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  level: LogLevel;
}

function createLogger(level?: LogLevel): Logger;
```

### CLI Flags

```bash
bonvoy shipit              # level: info (default)
bonvoy shipit --verbose    # level: debug
bonvoy shipit --quiet      # level: warn
bonvoy shipit --json       # level: silent (only JSON to stdout)
```

Flags added to all commands: `shipit`, `prepare`, `rollback`, `status`, `changelog`.

## Noise Fixes

### Octokit (plugin-github)

Pass a custom `log` to Octokit that routes to `logger.debug`:

```typescript
new Octokit({ auth: token, log: { debug: noop, info: noop, warn: noop, error: noop } });
```

Octokit request logs become invisible at default level.

### npm publish (plugin-npm)

Change `stdio: 'inherit'` → `stdio: 'pipe'`. Capture stdout/stderr:
- On success: pass output to `logger.debug()`
- On failure: include captured output in the thrown error

### GitLab (@gitbeaker)

Gitbeaker doesn't log by default — no change needed.

## Implementation

### Step 1: Logger in core
- Add `LogLevel` type and `createLogger()` to `@bonvoy/core`
- Add `debug` method to `Logger` interface
- Export from `index.ts`

### Step 2: CLI integration
- Add `--verbose` and `--quiet` flags to all commands
- Use `createLogger(level)` instead of inline `consoleLogger`/`silentLogger`
- Remove duplicated logger definitions from each command file

### Step 3: Plugin fixes
- `plugin-npm`: capture npm output, log as debug, show on error
- `plugin-github`: suppress Octokit request logging

### Step 4: Update tests
- Add `debug: vi.fn()` to all mock loggers
- Test `createLogger` at each level

---

*Feature: Logger*
*Status: In progress*
*Affects: @bonvoy/core, bonvoy (CLI), @bonvoy/plugin-npm, @bonvoy/plugin-github*
