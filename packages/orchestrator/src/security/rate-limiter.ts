/** Simple in-memory rate limiter for tool calls */
interface CallRecord {
  count: number;
  resetAt: number;
}

const DEFAULT_MAX_CALLS = 60; // per minute
const DEFAULT_WINDOW_MS = 60_000;

export class RateLimiter {
  private records = new Map<string, CallRecord>();
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls = DEFAULT_MAX_CALLS, windowMs = DEFAULT_WINDOW_MS) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    let record = this.records.get(key);

    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + this.windowMs };
      this.records.set(key, record);
    }

    record.count++;
    const remaining = Math.max(0, this.maxCalls - record.count);
    const resetIn = Math.max(0, record.resetAt - now);

    return { allowed: record.count <= this.maxCalls, remaining, resetIn };
  }

  reset(key?: string): void {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }
}

export const rateLimiter = new RateLimiter();
