/**
 * Exponential backoff retry with idempotency support
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  jitter?: boolean;
  idempotent?: boolean;
  retryableCheck?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true,
  idempotent: false,
  retryableCheck: () => true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponential = options.baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, options.maxDelay);
  if (!options.jitter) return capped;
  // Full jitter: random between 0 and capped
  return Math.random() * capped;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt >= opts.maxRetries) break;
      if (!opts.retryableCheck(lastError)) break;

      const delay = calculateDelay(attempt, opts);
      console.warn(
        `[retry] Attempt ${attempt + 1}/${opts.maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/** Create a retryable version of an async function */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: unknown[]) => retry(() => fn(...args) as Promise<unknown>, options)) as T;
}
