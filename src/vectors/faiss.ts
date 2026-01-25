/**
 * FAISS Vector Index Implementation
 * 
 * Uses faiss-node for efficient similarity search with IndexFlatIP (inner product).
 * Vectors are L2-normalized before adding so inner product = cosine similarity.
 * 
 * faiss-node is an optional dependency - if not installed, this module throws
 * an error when instantiated.
 */

import * as fs from 'node:fs';
import type { VectorIndex, VectorSearchResult } from '../types.js';

// Lazy-load faiss-node (optional dependency)
let IndexFlatIP: any = null;
let faissLoadAttempted = false;
let faissLoadError: Error | null = null;

/**
 * Attempt to load faiss-node (called lazily on first use)
 */
function ensureFaissLoaded(): void {
  if (faissLoadAttempted) return;
  faissLoadAttempted = true;
  
  try {
    // Use require for synchronous loading (works in both ESM and CJS)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const faissModule = require('faiss-node');
    IndexFlatIP = faissModule.IndexFlatIP;
  } catch (err) {
    faissLoadError = new Error(
      'faiss-node is not installed. Install it with: npm install faiss-node\n' +
      'Note: faiss-node requires native bindings and may not work on all platforms.'
    );
  }
}

type IndexFlatIPType = any;

/**
 * Check if faiss-node is available
 */
export function isFaissAvailable(): boolean {
  ensureFaissLoaded();
  return IndexFlatIP !== null;
}

/**
 * Get the faiss-node load error (if any)
 */
export function getFaissLoadError(): Error | null {
  ensureFaissLoaded();
  return faissLoadError;
}

export class FAISSIndex implements VectorIndex {
  private index: IndexFlatIPType;
  private vectors: Map<number, Float32Array>;
  private dims: number;
  private built: boolean = false;

  constructor(dims: number = 1536) {
    ensureFaissLoaded();
    if (!IndexFlatIP) {
      throw faissLoadError ?? new Error('faiss-node is not available');
    }
    this.dims = dims;
    this.index = new IndexFlatIP(dims);
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
   * Build the FAISS index from all stored vectors
   * Must be called before searching
   */
  build(): void {
    // Create a fresh index
    this.index = new IndexFlatIP(this.dims);

    if (this.vectors.size === 0) {
      this.built = true;
      return;
    }

    // Sort IDs to maintain consistent order
    const ids = Array.from(this.vectors.keys()).sort((a, b) => a - b);
    
    // Add all vectors to the index
    for (const id of ids) {
      const vec = this.vectors.get(id)!;
      this.index.add(Array.from(vec));
    }

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

    if (this.index.ntotal() === 0) {
      return { ids: [], distances: [] };
    }

    const normalized = this.normalize(vector);
    const searchN = Math.min(n, this.index.ntotal());
    
    const result = this.index.search(normalized, searchN);
    
    // Map FAISS internal indices back to our IDs
    const sortedIds = Array.from(this.vectors.keys()).sort((a, b) => a - b);
    const mappedIds: number[] = [];
    const angularDistances: number[] = [];

    for (let i = 0; i < result.labels.length; i++) {
      const faissIdx = result.labels[i];
      if (faissIdx >= 0 && faissIdx < sortedIds.length) {
        mappedIds.push(sortedIds[faissIdx]);
        // Convert inner product similarity to angular distance
        const similarity = result.distances[i];
        const angularDist = Math.sqrt(Math.max(0, 2 * (1 - similarity)));
        angularDistances.push(angularDist);
      }
    }

    return { ids: mappedIds, distances: angularDistances };
  }

  /**
   * Get a vector by ID
   */
  getVector(id: number): number[] | null {
    const vec = this.vectors.get(id);
    return vec ? Array.from(vec) : null;
  }

  /**
   * Get total number of vectors
   */
  getCount(): number {
    return this.vectors.size;
  }

  /**
   * Save the index to files
   * - indexPath: FAISS index file
   * - metaPath: JSONL file with vectors map for reconstruction
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

    // Save FAISS index
    this.index.write(indexPath);

    // Determine format by extension
    const useJsonl = metaPath.endsWith('.jsonl');

    if (useJsonl) {
      // JSONL format - streaming writes, no string size limits
      const lines: string[] = [];
      lines.push(JSON.stringify({ dims: this.dims }));
      
      this.vectors.forEach((vec, id) => {
        lines.push(JSON.stringify({ id, vector: Array.from(vec) }));
      });
      
      const tempPath = metaPath + '.tmp';
      fs.writeFileSync(tempPath, lines.join('\n') + '\n', 'utf-8');
      fs.renameSync(tempPath, metaPath);
    } else {
      // Legacy JSON format (for backward compatibility)
      const vectorsObj: Record<number, number[]> = {};
      this.vectors.forEach((vec, id) => {
        vectorsObj[id] = Array.from(vec);
      });

      const meta = {
        dims: this.dims,
        vectors: vectorsObj
      };

      fs.writeFileSync(metaPath, JSON.stringify(meta));
    }
  }

  /**
   * Load the index from files
   * Supports both JSONL and legacy JSON formats
   */
  load(indexPath: string, metaPath: string): void {
    ensureFaissLoaded();
    if (!IndexFlatIP) {
      throw faissLoadError ?? new Error('faiss-node is not available');
    }
    // Load FAISS index
    this.index = IndexFlatIP.read(indexPath) as IndexFlatIPType;

    // Load vectors map - detect format by extension
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const useJsonl = metaPath.endsWith('.jsonl');
    
    this.vectors = new Map();

    if (useJsonl) {
      // JSONL format - parse line by line
      const lines = metaContent.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('Empty JSONL metadata file');
      }
      
      // First line contains dims
      const header = JSON.parse(lines[0]) as { dims: number };
      this.dims = header.dims;
      
      // Rest are vector entries
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

    this.built = true;
  }

  /**
   * Get the dimensions of vectors in this index
   */
  getDims(): number {
    return this.dims;
  }
}
