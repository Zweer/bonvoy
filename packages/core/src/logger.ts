import type { Logger, LogLevel } from './schema.js';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export function createLogger(level: LogLevel = 'info'): Logger {
  const threshold = LEVELS[level];
  const noop = () => {};

  return {
    level,
    debug: threshold <= LEVELS.debug ? (msg: string) => console.debug(msg) : noop,
    info: threshold <= LEVELS.info ? (msg: string) => console.log(msg) : noop,
    warn: threshold <= LEVELS.warn ? (msg: string) => console.warn(msg) : noop,
    error: threshold <= LEVELS.error ? (msg: string) => console.error(msg) : noop,
  };
}

export const silentLogger: Logger = createLogger('silent');
