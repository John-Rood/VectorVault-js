/**
 * VectorVault TypeScript - Utilities Test Suite
 * 
 * Tests the utility classes and functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, sleep } from '../src/utils/index.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(limiter.getCurrentDelay()).toBe(1);
      expect(limiter.getAttempts()).toBe(0);
    });

    it('should accept custom options', () => {
      const customLimiter = new RateLimiter({
        baseDelay: 2,
        maxDelay: 30,
        backoffFactor: 3,
        maxAttempts: 5
      });
      expect(customLimiter.getCurrentDelay()).toBe(2);
    });
  });

  describe('onSuccess', () => {
    it('should reset delay to base after success', async () => {
      // Simulate a failure first to increase delay
      await limiter.onFailure();
      expect(limiter.getCurrentDelay()).toBeGreaterThan(1);
      
      // Success should reset
      limiter.onSuccess();
      expect(limiter.getCurrentDelay()).toBe(1);
      expect(limiter.getAttempts()).toBe(0);
    });
  });

  describe('onFailure', () => {
    it('should increase delay exponentially', async () => {
      const initialDelay = limiter.getCurrentDelay();
      
      await limiter.onFailure();
      const secondDelay = limiter.getCurrentDelay();
      expect(secondDelay).toBeGreaterThan(initialDelay);
      
      await limiter.onFailure();
      const thirdDelay = limiter.getCurrentDelay();
      expect(thirdDelay).toBeGreaterThan(secondDelay);
    });

    it('should not exceed maxDelay', async () => {
      const limiterWithLowMax = new RateLimiter({
        baseDelay: 1,
        maxDelay: 5,
        backoffFactor: 10
      });

      // Multiple failures should cap at maxDelay
      await limiterWithLowMax.onFailure();
      await limiterWithLowMax.onFailure();
      await limiterWithLowMax.onFailure();
      
      expect(limiterWithLowMax.getCurrentDelay()).toBeLessThanOrEqual(5);
    });

    it('should track attempt count', async () => {
      expect(limiter.getAttempts()).toBe(0);
      
      await limiter.onFailure();
      expect(limiter.getAttempts()).toBe(1);
      
      await limiter.onFailure();
      expect(limiter.getAttempts()).toBe(2);
    });

    it('should throw when maxAttempts exceeded', async () => {
      const limiterWithLowAttempts = new RateLimiter({
        baseDelay: 0.001, // Very small delay for fast testing
        maxAttempts: 2
      });

      await limiterWithLowAttempts.onFailure();
      await limiterWithLowAttempts.onFailure();
      
      await expect(limiterWithLowAttempts.onFailure()).rejects.toThrow('Max attempts (2) exceeded');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      await limiter.onFailure();
      await limiter.onFailure();
      
      expect(limiter.getAttempts()).toBe(2);
      expect(limiter.getCurrentDelay()).toBeGreaterThan(1);
      
      limiter.reset();
      
      expect(limiter.getAttempts()).toBe(0);
      expect(limiter.getCurrentDelay()).toBe(1);
    });
  });
});

describe('sleep', () => {
  it('should delay execution', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    
    // Should be at least 50ms (with some tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(200);
  });
});
