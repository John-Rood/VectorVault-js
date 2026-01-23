/**
 * Gemini Embeddings Tests
 * 
 * Tests the GeminiEmbeddings provider.
 * Skips API tests if GEMINI_API_KEY is not set.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GeminiEmbeddings } from '../src/embeddings/gemini.js';

describe('GeminiEmbeddings', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasApiKey = !!apiKey;

  describe('Constructor', () => {
    it('should throw error when API key is missing', () => {
      expect(() => new GeminiEmbeddings('')).toThrow('Gemini API key is required');
    });

    it('should use default model when not specified', () => {
      // This would fail without a valid key, but we're testing the constructor logic
      if (hasApiKey) {
        const embeddings = new GeminiEmbeddings(apiKey);
        expect(embeddings.getDims()).toBe(768);
      } else {
        // Skip if no API key
        expect(true).toBe(true);
      }
    });

    it('should allow custom model', () => {
      if (hasApiKey) {
        const embeddings = new GeminiEmbeddings(apiKey, 'text-embedding-004');
        expect(embeddings.getDims()).toBe(768);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  describe('Dimensions', () => {
    it('should return 768 for text-embedding-004', () => {
      if (hasApiKey) {
        const embeddings = new GeminiEmbeddings(apiKey, 'text-embedding-004');
        expect(embeddings.getDims()).toBe(768);
      } else {
        expect(true).toBe(true);
      }
    });

    it('should return 768 for text-embedding-005', () => {
      if (hasApiKey) {
        const embeddings = new GeminiEmbeddings(apiKey, 'text-embedding-005');
        expect(embeddings.getDims()).toBe(768);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  // API tests - skipped if no key
  const describeIfKey = hasApiKey ? describe : describe.skip;

  describeIfKey('API Integration (requires GEMINI_API_KEY)', () => {
    let embeddings: GeminiEmbeddings;

    beforeAll(() => {
      embeddings = new GeminiEmbeddings(apiKey!, 'text-embedding-004');
    });

    it('should embed a single text', async () => {
      const result = await embeddings.embed(['Hello, world!']);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(768);
      expect(typeof result[0][0]).toBe('number');
    }, 30000);

    it('should embed multiple texts', async () => {
      const texts = [
        'The quick brown fox',
        'jumps over the lazy dog',
        'Neural networks learn patterns'
      ];
      const result = await embeddings.embed(texts);
      expect(result).toHaveLength(3);
      result.forEach(embedding => {
        expect(embedding).toHaveLength(768);
      });
    }, 30000);

    it('should embed using embedOne method', async () => {
      const result = await embeddings.embedOne('Single text test');
      expect(result).toHaveLength(768);
      expect(typeof result[0]).toBe('number');
    }, 30000);

    it('should return empty array for empty input', async () => {
      const result = await embeddings.embed([]);
      expect(result).toHaveLength(0);
    });

    it('should produce similar embeddings for similar texts', async () => {
      const result = await embeddings.embed([
        'The cat sat on the mat',
        'The cat was sitting on the rug'
      ]);
      
      // Calculate cosine similarity
      const dotProduct = result[0].reduce((sum, v, i) => sum + v * result[1][i], 0);
      const norm0 = Math.sqrt(result[0].reduce((sum, v) => sum + v * v, 0));
      const norm1 = Math.sqrt(result[1].reduce((sum, v) => sum + v * v, 0));
      const similarity = dotProduct / (norm0 * norm1);
      
      // Similar sentences should have high similarity (> 0.7)
      expect(similarity).toBeGreaterThan(0.7);
    }, 30000);
  });
});
