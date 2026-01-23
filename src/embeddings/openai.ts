/**
 * OpenAI Embeddings Provider
 * 
 * Uses OpenAI's embedding API directly via fetch (no SDK dependency).
 * Default model: text-embedding-3-small (1536 dimensions)
 */

import type { EmbeddingsProvider } from '../types.js';

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
   * Embed a single batch of texts
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as OpenAIErrorResponse;
      const message = errorData.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`OpenAI API error: ${message}`);
    }

    const data = await response.json() as OpenAIEmbeddingResponse;
    
    // Sort by index to maintain order
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map(item => item.embedding);
  }

  /**
   * Embed a single text (convenience method)
   */
  async embedOne(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }
}
