import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withRetry } from '../src/retry.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function advanceRetries() {
    return vi.runAllTimersAsync();
  }

  it('should return result on first success', async () => {
    const result = await withRetry(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('should retry on transient error (status 429)', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 3) {
        const err = new Error('rate limited');
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
      return Promise.resolve('ok');
    };

    const promise = withRetry(fn, { retries: 3 });
    await advanceRetries();
    expect(await promise).toBe('ok');
    expect(calls).toBe(3);
  });

  it('should retry on transient error (status 503)', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 2) {
        const err = new Error('unavailable');
        (err as unknown as { status: number }).status = 503;
        throw err;
      }
      return Promise.resolve('done');
    };

    const promise = withRetry(fn, { retries: 3 });
    await advanceRetries();
    expect(await promise).toBe('done');
    expect(calls).toBe(2);
  });

  it('should retry on throttle message', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 2) throw new Error('This endpoint is temporarily being throttled');
      return Promise.resolve('ok');
    };

    const promise = withRetry(fn, { retries: 3 });
    await advanceRetries();
    expect(await promise).toBe('ok');
  });

  it('should not retry on permanent error (status 404)', async () => {
    const err = new Error('not found');
    (err as unknown as { status: number }).status = 404;

    await expect(withRetry(() => Promise.reject(err), { retries: 3 })).rejects.toThrow('not found');
  });

  it('should not retry on non-transient error', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      throw new Error('validation failed');
    };

    await expect(withRetry(fn, { retries: 3 })).rejects.toThrow('validation failed');
    expect(calls).toBe(1);
  });

  it('should not retry on non-object error', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      throw 'string error'; // eslint-disable-line no-throw-literal
    };

    await expect(withRetry(fn, { retries: 3 })).rejects.toBe('string error');
    expect(calls).toBe(1);
  });

  it('should retry on error with status but no message', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 2) throw { status: 429 };
      return Promise.resolve('ok');
    };

    const promise = withRetry(fn, { retries: 3 });
    await advanceRetries();
    expect(await promise).toBe('ok');
  });

  it('should retry on ECONNREFUSED without message property', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 2) throw { code: 'ECONNREFUSED' };
      return Promise.resolve('ok');
    };

    // No message property → || '' fallback → no match → not transient
    await expect(withRetry(fn, { retries: 3 })).rejects.toEqual({ code: 'ECONNREFUSED' });
    expect(calls).toBe(1);
  });

  it('should throw after exhausting retries', async () => {
    const err = new Error('throttled');
    (err as unknown as { status: number }).status = 429;

    const promise = withRetry(
      () => {
        throw err;
      },
      { retries: 2 },
    );
    // Catch early to prevent unhandled rejection, then advance timers
    const caught = promise.catch((e: Error) => e);
    await advanceRetries();
    const result = await caught;
    expect(result).toBe(err);
  });

  it('should log retry attempts', async () => {
    const logger = { warn: vi.fn() };
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 2) {
        const err = new Error('rate limited');
        (err as unknown as { status: number }).status = 429;
        throw err;
      }
      return Promise.resolve('ok');
    };

    const promise = withRetry(fn, { retries: 3, logger });
    await advanceRetries();
    await promise;
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Transient error, retrying'));
  });

  it('should retry on ETIMEDOUT', async () => {
    let calls = 0;
    const fn = () => {
      calls++;
      if (calls < 2) throw new Error('connect ETIMEDOUT');
      return Promise.resolve('ok');
    };

    const promise = withRetry(fn, { retries: 3 });
    await advanceRetries();
    expect(await promise).toBe('ok');
  });

  it('should retry on status 500, 502, and 504', async () => {
    for (const status of [500, 502, 504]) {
      let calls = 0;
      const fn = () => {
        calls++;
        if (calls < 2) {
          const err = new Error('server error');
          (err as unknown as { status: number }).status = status;
          throw err;
        }
        return Promise.resolve('ok');
      };

      const promise = withRetry(fn, { retries: 3 });
      await advanceRetries();
      expect(await promise).toBe('ok');
    }
  });
});
