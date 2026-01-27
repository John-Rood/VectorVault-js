/**
 * Gemini Embeddings Provider
 * 
 * Uses Google's Gemini embedding API directly via fetch.
 * Default model: text-embedding-004 (768 dimensions)
 * 
 * Includes automatic retry with exponential backoff for rate limits and transient errors.
 */

import type { EmbeddingsProvider } from '../types.js';
import { RateLimiter, sleep } from '../utils/rate-limiter.js';

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

interface GeminiErrorResponse {
  error: {
    message: string;
    status: string;
    code: number;
  };
}

const MODEL_DIMS: Record<string, number> = {
  'text-embedding-004': 768,
  'text-embedding-005': 768,
  'embedding-001': 768,
};

export class GeminiEmbeddings implements EmbeddingsProvider {
  private apiKey: string;
  private model: string;
  private dims: number;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string = 'text-embedding-004'
  ) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.dims = MODEL_DIMS[model] ?? 768;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Get embedding dimensions for this model
   */
  getDims(): number {
    return this.dims;
  }

  /**
   * Generate embeddings for one or more texts
   * Uses batch endpoint for multiple texts
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // Gemini batch endpoint can handle multiple texts at once
    // Limit to 100 per request for safety
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await this.embedBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Embed a single batch of texts with automatic retry on failure
   * Never fails permanently - will retry with exponential backoff until success
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
    const limiter = new RateLimiter({
      baseDelay: 1,
      maxDelay: 120,
      backoffFactor: 2,
      maxAttempts: 50,
    });

    // Build batch request
    const requests = texts.map((text) => ({
      model: `models/${this.model}`,
      content: {
        parts: [{ text }]
      }
    }));

    while (true) {
      try {
        const response = await fetch(
          `${this.baseUrl}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
          }
        );

        // Rate limited - retry with backoff
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            await sleep(parseInt(retryAfter, 10) * 1000);
          }
          await limiter.onFailure();
          continue;
        }

        // Server error (5xx) - retry with backoff
        if (response.status >= 500) {
          await limiter.onFailure();
          continue;
        }

        // Client error (4xx except 429) - throw immediately
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as GeminiErrorResponse;
          const message = errorData.error?.message ?? `HTTP ${response.status}`;
          throw new Error(`Gemini API error: ${message}`);
        }

        // Success!
        limiter.onSuccess();
        const data = await response.json() as GeminiBatchEmbeddingResponse;
        return data.embeddings.map((e) => e.values);

      } catch (error) {
        // Network errors, timeouts, etc - retry with backoff
        if (error instanceof TypeError || (error as Error).message?.includes('fetch')) {
          await limiter.onFailure();
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Embed a single text with automatic retry on failure
   */
  async embedOne(text: string): Promise<number[]> {
    const limiter = new RateLimiter({
      baseDelay: 1,
      maxDelay: 120,
      backoffFactor: 2,
      maxAttempts: 50,
    });

    while (true) {
      try {
        const response = await fetch(
          `${this.baseUrl}/models/${this.model}:embedContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: `models/${this.model}`,
              content: {
                parts: [{ text }]
              }
            })
          }
        );

        // Rate limited - retry with backoff
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            await sleep(parseInt(retryAfter, 10) * 1000);
          }
          await limiter.onFailure();
          continue;
        }

        // Server error (5xx) - retry with backoff
        if (response.status >= 500) {
          await limiter.onFailure();
          continue;
        }

        // Client error (4xx except 429) - throw immediately
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as GeminiErrorResponse;
          const message = errorData.error?.message ?? `HTTP ${response.status}`;
          throw new Error(`Gemini API error: ${message}`);
        }

        // Success!
        limiter.onSuccess();
        const data = await response.json() as GeminiEmbeddingResponse;
        return data.embedding.values;

      } catch (error) {
        // Network errors, timeouts, etc - retry with backoff
        if (error instanceof TypeError || (error as Error).message?.includes('fetch')) {
          await limiter.onFailure();
          continue;
        }
        throw error;
      }
    }
  }
}
