/**
 * VectorVault TypeScript Types
 */

export interface VaultConfig {
  /** Name of the vault */
  vault: string;
  /** User email (for cloud mode) */
  user?: string;
  /** VectorVault API key (for cloud mode) */
  apiKey?: string;
  /** OpenAI API key for embeddings and chat */
  openaiKey?: string;
  /** Anthropic API key for chat (optional) */
  anthropicKey?: string;
  /** Use local filesystem storage instead of cloud */
  local?: boolean;
  /** Base directory for local storage (default: ~/.vectorvault) */
  localDir?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Embedding dimensions (default: 1536 for text-embedding-3-small) */
  dims?: number;
  /** Embeddings model to use */
  embeddingsModel?: string;
  /** Default chat model (default: 'gpt-4o-mini') */
  chatModel?: string;
  /** Default temperature for chat (default: 0) */
  chatTemperature?: number;
}

export interface ItemMetadata {
  /** Optional item name */
  name?: string;
  /** Unique item ID (sequential integer) */
  item_id: number;
  /** ISO timestamp when item was created */
  created: string;
  /** ISO timestamp when item was last updated */
  updated: string;
  /** Unix timestamp */
  time?: number;
  /** Additional custom metadata */
  [key: string]: unknown;
}

export interface Item {
  /** The text content of the item */
  data: string;
  /** Item metadata */
  metadata: ItemMetadata;
}

export interface SearchResult extends Item {
  /** Distance/similarity score (lower = more similar for angular distance) */
  distance?: number;
}

// ChatOptions moved to src/chat/types.ts for comprehensive chat functionality

export interface VectorSearchResult {
  /** Array of item IDs sorted by similarity */
  ids: number[];
  /** Array of distances corresponding to IDs */
  distances: number[];
}

export interface StorageManager {
  /** Upload an item to storage */
  upload(uuid: string, text: string, meta: ItemMetadata): Promise<void>;
  /** Download text from storage */
  downloadText(path: string): Promise<string | null>;
  /** Delete an item from storage */
  deleteItem(uuid: string): Promise<void>;
  /** Check if an item exists */
  itemExists(uuid: string): Promise<boolean>;
  /** Get the item mapping (id -> uuid) */
  getMapping(): Promise<Record<string, string>>;
  /** Save the item mapping */
  saveMapping(mapping: Record<string, string>): Promise<void>;
  /** List all vaults */
  listVaults(): Promise<string[]>;
  /** Delete the entire vault */
  deleteVault(): Promise<void>;
  /** Save vectors to storage */
  saveVectors(indexPath: string, metaPath: string): Promise<void>;
  /** Load vectors from storage */
  loadVectors(): Promise<{ indexPath: string; metaPath: string } | null>;
  /** Save personality message */
  savePersonalityMessage(message: string): Promise<void>;
  /** Get personality message */
  getPersonalityMessage(): Promise<string | null>;
  /** Save custom prompt */
  saveCustomPrompt(prompt: string, withContext: boolean): Promise<void>;
  /** Get custom prompt */
  getCustomPrompt(withContext: boolean): Promise<string | null>;
}

export interface VectorIndex {
  /** Add a vector with the given ID */
  add(id: number, vector: number[]): void;
  /** Build the index (must be called after adding vectors) */
  build(): void;
  /** Search for nearest neighbors */
  search(vector: number[], n: number): VectorSearchResult;
  /** Get a vector by ID */
  getVector(id: number): number[] | null;
  /** Get total number of vectors */
  getCount(): number;
  /** Save the index to files */
  save(indexPath: string, metaPath: string): void;
  /** Load the index from files */
  load(indexPath: string, metaPath: string): void;
}

export interface EmbeddingsProvider {
  /** Generate embeddings for one or more texts */
  embed(texts: string[]): Promise<number[][]>;
  /** Get embedding dimensions */
  getDims(): number;
}

/** Internal item structure before saving */
export interface PendingItem {
  text: string;
  meta: Partial<ItemMetadata>;
  uuid: string;
}
