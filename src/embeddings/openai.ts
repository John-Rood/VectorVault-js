/**
 * OpenAI Embeddings Provider
 * 
 * Uses OpenAI's embedding API directly via fetch (no SDK dependency).
 * Default model: text-embedding-3-small (1536 dimensions)
 * 
 * Includes automatic retry with exponential backoff for rate limits and transient errors.
 */

import type { EmbeddingsProvider } from '../types.js';
import { RateLimiter, sleep } from '../utils/rate-limiter.js';

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

const MODEL_DIMS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536
};

export class OpenAIEmbeddings implements EmbeddingsProvider {
  private apiKey: string;
  private model: string;
  private dims: number;
  private baseUrl: string;

  constructor(
    apiKey: string,
    model: string = 'text-embedding-3-small',
    baseUrl: string = 'https://api.openai.com/v1'
  ) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.dims = MODEL_DIMS[model] ?? 1536;
    this.baseUrl = baseUrl;
  }

  /**
   * Get embedding dimensions for this model
   */
  getDims(): number {
    return this.dims;
  }

  /**
   * Generate embeddings for one or more texts
   * Handles batching automatically
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    // OpenAI accepts up to 2048 texts per request, but we'll batch at 100 for safety
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
      maxAttempts: 50, // Very high - we really don't want this to fail
    });

    while (true) {
      try {
        const response = await fetch(`${this.baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: texts,
            model: this.model
          })
        });

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
          const errorData = await response.json().catch(() => ({})) as OpenAIErrorResponse;
          const message = errorData.error?.message ?? `HTTP ${response.status}`;
          throw new Error(`OpenAI API error: ${message}`);
        }

        // Success!
        limiter.onSuccess();
        const data = await response.json() as OpenAIEmbeddingResponse;
        
        // Sort by index to maintain order
        const sorted = data.data.sort((a, b) => a.index - b.index);
        return sorted.map(item => item.embedding);

      } catch (error) {
        // Network errors, timeouts, etc - retry with backoff
        if (error instanceof TypeError || (error as Error).message?.includes('fetch')) {
          await limiter.onFailure();
          continue;
        }
        // Re-throw non-retryable errors
        throw error;
      }
    }
  }

  /**
   * Embed a single text (convenience method)
   */
  async embedOne(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }
}
