/**
 * FAISS Vector Index Implementation
 * 
 * Uses faiss-node for efficient similarity search with IndexFlatIP (inner product).
 * Vectors are L2-normalized before adding so inner product = cosine similarity.
 */

import faiss from 'faiss-node';
const { IndexFlatIP } = faiss;
import * as fs from 'node:fs';
import type { VectorIndex, VectorSearchResult } from '../types.js';

type IndexFlatIPType = InstanceType<typeof IndexFlatIP>;

export class FAISSIndex implements VectorIndex {
  private index: IndexFlatIPType;
  private vectors: Map<number, Float32Array>;
  private dims: number;
  private built: boolean = false;

  constructor(dims: number = 1536) {
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
   * - metaPath: JSON file with vectors map for reconstruction
   */
  save(indexPath: string, metaPath: string): void {
    if (!this.built) {
      this.build();
    }

    // Save FAISS index
    this.index.write(indexPath);

    // Save vectors map as JSON for reconstruction
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

  /**
   * Load the index from files
   */
  load(indexPath: string, metaPath: string): void {
    // Load FAISS index
    this.index = IndexFlatIP.read(indexPath) as IndexFlatIPType;

    // Load vectors map
    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent) as { dims: number; vectors: Record<string, number[]> };
    
    this.dims = meta.dims;
    this.vectors = new Map();
    
    for (const [idStr, vec] of Object.entries(meta.vectors)) {
      this.vectors.set(Number(idStr), new Float32Array(vec));
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
