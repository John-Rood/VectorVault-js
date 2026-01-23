/**
 * RateLimiter - Exponential backoff utility for API rate limiting
 * 
 * Use this to handle API rate limits gracefully with automatic retry delays.
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter();
 * 
 * while (true) {
 *   try {
 *     const result = await apiCall();
 *     limiter.onSuccess();
 *     return result;
 *   } catch (error) {
 *     if (isRateLimitError(error)) {
 *       await limiter.onFailure();
 *       continue;
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export class RateLimiter {
  private baseDelay: number;
  private maxDelay: number;
  private backoffFactor: number;
  private currentDelay: number;
  private maxAttempts: number;
  private attempts: number = 0;

  /**
   * Create a new rate limiter
   * 
   * @param options Configuration options
   * @param options.baseDelay Initial delay in seconds (default: 1)
   * @param options.maxDelay Maximum delay in seconds (default: 60)
   * @param options.backoffFactor Multiplier for exponential backoff (default: 2)
   * @param options.maxAttempts Maximum retry attempts (default: 30)
   */
  constructor(options?: {
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    maxAttempts?: number;
  }) {
    this.baseDelay = options?.baseDelay ?? 1;
    this.maxDelay = options?.maxDelay ?? 60;
    this.backoffFactor = options?.backoffFactor ?? 2;
    this.maxAttempts = options?.maxAttempts ?? 30;
    this.currentDelay = this.baseDelay;
  }

  /**
   * Call after a successful API call to reset the delay
   */
  onSuccess(): void {
    this.currentDelay = this.baseDelay;
    this.attempts = 0;
  }

  /**
   * Call after a rate limit failure
   * Waits for the current delay period, then increases the delay
   * 
   * @returns Promise that resolves after the delay
   * @throws Error if max attempts exceeded
   */
  async onFailure(): Promise<void> {
    this.attempts++;
    
    if (this.attempts > this.maxAttempts) {
      throw new Error(`RateLimiter: Max attempts (${this.maxAttempts}) exceeded`);
    }

    // Add random jitter to prevent thundering herd
    const jitter = Math.random() * 0.5 + 0.75; // 0.75-1.25x
    const delay = this.currentDelay * jitter;
    
    await sleep(delay * 1000);
    
    // Exponential backoff
    this.currentDelay = Math.min(
      this.currentDelay * this.backoffFactor, 
      this.maxDelay
    );
  }

  /**
   * Get the current delay value (for debugging/logging)
   */
  getCurrentDelay(): number {
    return this.currentDelay;
  }

  /**
   * Get the number of attempts so far
   */
  getAttempts(): number {
    return this.attempts;
  }

  /**
   * Reset the limiter to initial state
   */
  reset(): void {
    this.currentDelay = this.baseDelay;
    this.attempts = 0;
  }
}

/**
 * Sleep utility function
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
