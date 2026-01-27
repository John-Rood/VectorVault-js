/**
 * Pure TypeScript In-Memory Vector Index
 *
 * Uses brute-force cosine similarity search.
 * Vectors are L2-normalized before adding so inner product = cosine similarity.
 *
 * No native dependencies - works everywhere TypeScript runs.
 */

import * as fs from 'node:fs';
import type { VectorIndex, VectorSearchResult } from '../types.js';

export class MemoryVectorIndex implements VectorIndex {
  private vectors: Map<number, Float32Array>;
  private dims: number;
  private built: boolean = false;
  private sortedIds: number[] = [];

  constructor(dims: number = 1536) {
    this.dims = dims;
    this.vectors = new Map();
  }

  /**
   * L2 normalize a vector (for cosine similarity via inner product)
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }

  /**
   * Compute inner product between two vectors
   */
  private innerProduct(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  /**
   * Add a vector with the given ID
   * Vector is normalized and stored for later reconstruction
   */
  add(id: number, vector: number[]): void {
    if (vector.length !== this.dims) {
      throw new Error(`Vector dimension mismatch: expected ${this.dims}, got ${vector.length}`);
    }
    const normalized = this.normalize(vector);
    this.vectors.set(id, new Float32Array(normalized));
    this.built = false; // Index needs rebuilding
  }

  /**
   * Build the index from all stored vectors
   * Must be called before searching
   */
  build(): void {
    // Sort IDs for consistent ordering
    this.sortedIds = Array.from(this.vectors.keys()).sort((a, b) => a - b);
    this.built = true;
  }

  /**
   * Search for the n nearest neighbors to a query vector
   * Returns IDs and distances (angular distance: sqrt(2*(1-cosine)))
   */
  search(vector: number[], n: number): VectorSearchResult {
    if (!this.built) {
      throw new Error('Index not built. Call build() before searching.');
    }

    if (this.vectors.size === 0) {
      return { ids: [], distances: [] };
    }

    const normalized = new Float32Array(this.normalize(vector));

    // Compute similarities for all vectors
    const similarities: Array<{ id: number; similarity: number }> = [];

    for (const id of this.sortedIds) {
      const vec = this.vectors.get(id);
      if (!vec) continue; // Skip removed items (deferred delete)
      const similarity = this.innerProduct(normalized, vec);
      similarities.push({ id, similarity });
    }

    // Sort by similarity (descending - higher is better)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Take top n
    const topN = similarities.slice(0, n);

    // Convert to angular distance for compatibility with FAISS output
    const ids: number[] = [];
    const distances: number[] = [];

    for (const { id, similarity } of topN) {
      ids.push(id);
      // Angular distance: sqrt(2*(1-cosine))
      const angularDist = Math.sqrt(Math.max(0, 2 * (1 - similarity)));
      distances.push(angularDist);
    }

    return { ids, distances };
  }

  /**
   * Get a vector by ID
   */
  getVector(id: number): number[] | null {
    const vec = this.vectors.get(id);
    return vec ? Array.from(vec) : null;
  }

  /**
   * Remove a vector by ID (deferred delete — sortedIds cleaned on next build())
   */
  remove(id: number): boolean {
    return this.vectors.delete(id);
  }

  /**
   * Get total number of vectors
   */
  getCount(): number {
    return this.vectors.size;
  }

  /**
   * Save the index to files
   * - indexPath: Binary file with packed vectors (for fast loading)
   * - metaPath: JSONL file with metadata
   *
   * JSONL format (one JSON object per line):
   *   {"dims":1536}
   *   {"id":0,"vector":[0.1,0.2,...]}
   *   {"id":1,"vector":[0.3,0.4,...]}
   */
  save(indexPath: string, metaPath: string): void {
    if (!this.built) {
      this.build();
    }

    // Save binary index (packed Float32 vectors)
    const ids = Array.from(this.vectors.keys()).sort((a, b) => a - b);
    const headerSize = 8; // 4 bytes dims + 4 bytes count
    const vectorBytes = this.dims * 4; // Float32 = 4 bytes
    const idBytes = 4; // Int32 for ID
    const totalSize = headerSize + ids.length * (idBytes + vectorBytes);

    const buffer = Buffer.alloc(totalSize);
    let offset = 0;

    // Write header
    buffer.writeInt32LE(this.dims, offset); offset += 4;
    buffer.writeInt32LE(ids.length, offset); offset += 4;

    // Write id + vector pairs
    for (const id of ids) {
      buffer.writeInt32LE(id, offset); offset += 4;
      const vec = this.vectors.get(id)!;
      for (let i = 0; i < this.dims; i++) {
        buffer.writeFloatLE(vec[i], offset); offset += 4;
      }
    }

    // Atomic write for index
    const tempIndex = indexPath + '.tmp';
    fs.writeFileSync(tempIndex, buffer);
    fs.renameSync(tempIndex, indexPath);

    // Save JSONL metadata using incremental writes (avoids string length limit)
    const tempMeta = metaPath + '.tmp';

    // Write header first
    fs.writeFileSync(tempMeta, JSON.stringify({ dims: this.dims }) + '\n', 'utf-8');

    // Append vectors in batches to avoid memory issues
    const BATCH_SIZE = 100;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const lines: string[] = [];
      for (const id of batch) {
        const vec = this.vectors.get(id)!;
        lines.push(JSON.stringify({ id, vector: Array.from(vec) }));
      }
      fs.appendFileSync(tempMeta, lines.join('\n') + '\n', 'utf-8');
    }

    fs.renameSync(tempMeta, metaPath);
  }

  /**
   * Load the index from files
   * Supports both binary and JSONL formats
   */
  load(indexPath: string, metaPath: string): void {
    this.vectors = new Map();

    // Try loading from binary index first (faster)
    if (fs.existsSync(indexPath)) {
      try {
        const buffer = fs.readFileSync(indexPath);
        let offset = 0;

        this.dims = buffer.readInt32LE(offset); offset += 4;
        const count = buffer.readInt32LE(offset); offset += 4;

        for (let i = 0; i < count; i++) {
          const id = buffer.readInt32LE(offset); offset += 4;
          const vec = new Float32Array(this.dims);
          for (let j = 0; j < this.dims; j++) {
            vec[j] = buffer.readFloatLE(offset); offset += 4;
          }
          this.vectors.set(id, vec);
        }

        this.built = false;
        this.build();
        return;
      } catch {
        // Fall through to JSONL loading
      }
    }

    // Load from JSONL metadata
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const useJsonl = metaPath.endsWith('.jsonl');

    if (useJsonl) {
      const lines = metaContent.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('Empty JSONL metadata file');
      }

      const header = JSON.parse(lines[0]) as { dims: number };
      this.dims = header.dims;

      for (let i = 1; i < lines.length; i++) {
        const entry = JSON.parse(lines[i]) as { id: number; vector: number[] };
        this.vectors.set(entry.id, new Float32Array(entry.vector));
      }
    } else {
      // Legacy JSON format
      const meta = JSON.parse(metaContent) as { dims: number; vectors: Record<string, number[]> };
      this.dims = meta.dims;

      for (const [idStr, vec] of Object.entries(meta.vectors)) {
        this.vectors.set(Number(idStr), new Float32Array(vec));
      }
    }

    this.built = false;
    this.build();
  }

  /**
   * Get the dimensions of vectors in this index
   */
  getDims(): number {
    return this.dims;
  }
}

/**
 * Check if MemoryVectorIndex is available (always true - pure TypeScript)
 */
export function isMemoryIndexAvailable(): boolean {
  return true;
}
