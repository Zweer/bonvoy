const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isTransient(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const status = (error as { status?: number }).status;
    if (status && TRANSIENT_STATUS_CODES.has(status)) return true;

    const message = (error as { message?: string }).message || '';
    if (/throttl|rate.?limit|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(message)) return true;
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; logger?: { warn(msg: string): void } },
): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries || !isTransient(error)) throw error;

      const delay = BASE_DELAY_MS * 2 ** attempt;
      options?.logger?.warn(
        `  ⏳ Transient error, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${retries})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error('Retry exhausted');
}
