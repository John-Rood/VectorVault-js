/**
 * VectorVault - Main Vault Class
 *
 * A local-first vector database for AI applications.
 * Uses pure TypeScript in-memory vector search in local mode,
 * or VectorVault Cloud API for cloud mode.
 */

import { randomUUID } from 'node:crypto';
import type { 
  VaultConfig, 
  Item, 
  ItemMetadata, 
  SearchResult, 
  PendingItem,
  EmbeddingsProvider,
  VaultSelector 
} from './types.js';
import { MemoryVectorIndex } from './vectors/memory.js';
import { LocalStorageManager } from './storage/local.js';
import { CloudStorageManager } from './storage/cloud.js';
import { OpenAIEmbeddings } from './embeddings/openai.js';
import { GeminiEmbeddings } from './embeddings/gemini.js';
import { OpenAIChatClient } from './chat/openai.js';
import { AnthropicChatClient } from './chat/anthropic.js';
import { LLMClient } from './chat/client.js';
import type { ChatOptions, ChatResponse, ChatResponseWithContext, FlowOptions } from './chat/types.js';

/** Gemini embedding models */
const GEMINI_EMBEDDING_MODELS = [
  'text-embedding-004',
  'text-embedding-005',
  'embedding-001'
];

/** Check if model is a Gemini embedding model */
function isGeminiEmbeddingModel(model: string): boolean {
  return GEMINI_EMBEDDING_MODELS.some(m => model.includes(m));
}

/** Check if model is an Anthropic chat model */
function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude-');
}

export class Vault {
  private config: VaultConfig;
  private storage: LocalStorageManager | null = null;
  private cloudStorage: CloudStorageManager | null = null;
  private index: MemoryVectorIndex | null = null;
  private embeddings: EmbeddingsProvider | null = null;
  private chatClient: LLMClient | null = null;
  private mapping: Record<string, string> = {};
  private pendingItems: PendingItem[] = [];
  private nextId: number = 0;
  private loaded: boolean = false;
  private verbose: boolean;
  private isLocal: boolean;

  constructor(config: VaultConfig) {
    this.config = {
      dims: 1536,
      embeddingsModel: 'text-embedding-3-small',
      ...config
    };

    this.verbose = config.verbose ?? false;
    this.isLocal = config.local ?? true;

    // Validate config
    if (!this.config.vault) {
      throw new Error('Vault name is required');
    }

    if (this.isLocal) {
      // Local mode
      this.storage = new LocalStorageManager(this.config.vault, this.config.localDir);

      // Auto-select embeddings provider based on model
      const embeddingsModel = this.config.embeddingsModel ?? 'text-embedding-3-small';
      
      if (isGeminiEmbeddingModel(embeddingsModel)) {
        // Gemini embeddings
        if (!this.config.geminiKey) {
          throw new Error('Gemini API key required for Gemini embedding models (geminiKey)');
        }
        // Adjust dimensions for Gemini (768 vs OpenAI's 1536/3072)
        this.config.dims = 768;
        this.index = new MemoryVectorIndex(768);
        this.embeddings = new GeminiEmbeddings(
          this.config.geminiKey,
          embeddingsModel
        );
      } else if (this.config.openaiKey) {
        // OpenAI embeddings (default, optional)
        this.index = new MemoryVectorIndex(this.config.dims ?? 1536);
        this.embeddings = new OpenAIEmbeddings(
          this.config.openaiKey,
          embeddingsModel
        );
      } else {
        // No embeddings provider - vault will work for storage only
        this.index = new MemoryVectorIndex(this.config.dims ?? 1536);
      }

      // Auto-select chat client based on model
      this.initializeChatClient();
    } else {
      // Cloud mode
      if (!this.config.user || !this.config.apiKey) {
        throw new Error('Cloud mode requires user and apiKey');
      }

      this.cloudStorage = new CloudStorageManager(
        this.config.user,
        this.config.apiKey,
        this.config.vault,
        this.config.embeddingsModel
      );

      // Initialize embeddings if API key provided
      const embeddingsModel = this.config.embeddingsModel ?? 'text-embedding-3-small';
      
      if (isGeminiEmbeddingModel(embeddingsModel) && this.config.geminiKey) {
        this.embeddings = new GeminiEmbeddings(
          this.config.geminiKey,
          embeddingsModel
        );
      } else if (this.config.openaiKey) {
        this.embeddings = new OpenAIEmbeddings(
          this.config.openaiKey,
          embeddingsModel
        );
      }

      // Initialize chat client if possible
      this.initializeChatClient();
    }

    this.log(`Vault "${this.config.vault}" initialized (${this.isLocal ? 'local' : 'cloud'} mode)`);
  }

  /**
   * Initialize the chat client based on model and available API keys
   * Auto-selects Anthropic for claude-* models, OpenAI otherwise
   */
  private initializeChatClient(): void {
    const chatModel = this.config.chatModel ?? 'gpt-4o-mini';
    const temperature = this.config.chatTemperature ?? 0;

    if (isAnthropicModel(chatModel)) {
      // Use Anthropic for Claude models
      if (this.config.anthropicKey) {
        this.chatClient = new AnthropicChatClient({
          apiKey: this.config.anthropicKey,
          defaultModel: chatModel,
          defaultTemperature: temperature
        });
        this.log(`Chat client: Anthropic (${chatModel})`);
      } else {
        this.log('Warning: Claude model specified but no anthropicKey provided');
      }
    } else if (this.config.openaiKey) {
      // Use OpenAI for other models
      this.chatClient = new OpenAIChatClient({
        apiKey: this.config.openaiKey,
        defaultModel: chatModel,
        defaultTemperature: temperature
      });
      this.log(`Chat client: OpenAI (${chatModel})`);
    }
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[VectorVault] ${message}`);
    }
  }

  /**
   * Load vault data from storage (mapping and vectors)
   * Only applies to local mode
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded || !this.isLocal) return;

    // Load mapping
    this.mapping = await this.storage!.getMapping();
    this.nextId = Object.keys(this.mapping).length;
    this.log(`Loaded mapping with ${this.nextId} items`);

    // Load vectors if they exist
    const vectorPaths = await this.storage!.loadVectors();
    if (vectorPaths) {
      try {
        this.index!.load(vectorPaths.indexPath, vectorPaths.metaPath);
        this.log(`Loaded vectors from storage`);
      } catch (error) {
        this.log(`Warning: Could not load vectors: ${error}`);
      }
    }

    this.loaded = true;
  }

  // ==================== Core Operations ====================

  /**
   * Add text to the vault (queued for embedding)
   * Call getVectors() then save() to persist
   */
  add(text: string, meta?: Partial<ItemMetadata>): void {
    const uuid = randomUUID();
    this.pendingItems.push({ text, meta: meta ?? {}, uuid });
    this.log(`Added item to queue (${this.pendingItems.length} pending)`);
  }

  /**
   * Generate embeddings for all pending items
   * In cloud mode, this is handled by the cloud API
   */
  async getVectors(): Promise<void> {
    if (this.pendingItems.length === 0) {
      this.log('No pending items to process');
      return;
    }

    if (!this.isLocal) {
      // Cloud mode - embeddings are generated server-side in save()
      this.log(`${this.pendingItems.length} items ready for cloud upload`);
      return;
    }

    await this.ensureLoaded();

    this.log(`Generating embeddings for ${this.pendingItems.length} items...`);
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized. Provide openaiKey or geminiKey in config to generate vectors.');
    }
    const texts = this.pendingItems.map(item => item.text);
    const vectors = await this.embeddings.embed(texts);

    // Add vectors to index
    for (let i = 0; i < this.pendingItems.length; i++) {
      const item = this.pendingItems[i];
      const itemId = this.nextId;
      
      // Build full metadata
      const now = new Date().toISOString();
      const fullMeta: ItemMetadata = {
        name: item.meta.name ?? `${this.config.vault}-${itemId}`,
        item_id: itemId,
        created: now,
        updated: now,
        time: Date.now() / 1000,
        ...item.meta
      };

      // Store in mapping
      this.mapping[String(itemId)] = item.uuid;
      
      // Add vector to index
      this.index!.add(itemId, vectors[i]);

      // Store item data (text + meta) - will be saved in save()
      (item as PendingItem & { fullMeta: ItemMetadata; vector: number[] }).fullMeta = fullMeta;
      
      this.nextId++;
    }

    // Build the index
    this.index!.build();
    this.log(`Generated ${vectors.length} embeddings, index built`);
  }

  /**
   * Save all pending items and vectors to storage
   */
  async save(): Promise<void> {
    if (!this.isLocal) {
      // Cloud mode - upload items via API
      for (const item of this.pendingItems) {
        await this.cloudStorage!.addCloud(item.text, item.meta as ItemMetadata);
      }
      const savedCount = this.pendingItems.length;
      this.pendingItems = [];
      this.log(`Uploaded ${savedCount} items to cloud`);
      return;
    }

    await this.ensureLoaded();

    if (this.pendingItems.length === 0 && this.index!.getCount() === 0) {
      this.log('Nothing to save');
      return;
    }

    this.log('Saving vault...');

    // Save each pending item's text and metadata
    for (const item of this.pendingItems) {
      const itemWithMeta = item as PendingItem & { fullMeta?: ItemMetadata };
      if (itemWithMeta.fullMeta) {
        await this.storage!.upload(item.uuid, item.text, itemWithMeta.fullMeta);
      }
    }

    // Save mapping
    await this.storage!.saveMapping(this.mapping);

    // Save vectors
    const indexPath = this.storage!.getVectorsIndexPath();
    const metaPath = this.storage!.getVectorsMetaPath();
    this.index!.save(indexPath, metaPath);

    // Clear pending items
    const savedCount = this.pendingItems.length;
    this.pendingItems = [];

    this.log(`Saved ${savedCount} items, total: ${this.nextId}`);
  }

  /**
   * Convenience method: add text and save immediately
   */
  async addAndSave(text: string, meta?: Partial<ItemMetadata>): Promise<void> {
    this.add(text, meta);
    await this.getVectors();
    await this.save();
  }

  // ==================== Search ====================

  /**
   * Find similar items by text
   */
  async getSimilar(text: string, n: number = 4): Promise<SearchResult[]> {
    if (!this.isLocal) {
      // Cloud mode
      return this.cloudStorage!.getSimilar(text, n, true);
    }

    await this.ensureLoaded();

    if (this.index!.getCount() === 0) {
      this.log('No items in vault to search');
      return [];
    }

    // Get embedding for search text
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized. Provide openaiKey or geminiKey in config to use getSimilar.');
    }
    const queryVector = await this.embeddings.embed([text]);
    
    // Search index
    const searchResult = this.index!.search(queryVector[0], n);
    
    // Fetch items
    const results: SearchResult[] = [];
    for (let i = 0; i < searchResult.ids.length; i++) {
      const itemId = searchResult.ids[i];
      const distance = searchResult.distances[i];
      const uuid = this.mapping[String(itemId)];
      
      if (uuid) {
        const itemText = await this.storage!.getItemText(uuid);
        const itemMeta = await this.storage!.getItemMeta(uuid);
        
        if (itemText && itemMeta) {
          results.push({
            data: itemText,
            metadata: itemMeta,
            distance
          });
        }
      }
    }

    this.log(`Found ${results.length} similar items`);
    return results;
  }

  /**
   * Generate an embedding vector for a text string.
   * Use this to embed once and then call searchByVector() multiple times.
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.isLocal) {
      throw new Error('embedText is only supported in local mode');
    }
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized. Provide openaiKey or geminiKey in config to use embedText.');
    }
    const vectors = await this.embeddings.embed([text]);
    return vectors[0];
  }

  /**
   * Find similar items using a pre-computed embedding vector.
   * Use embedText() first to get the vector, then call this for each search.
   * This avoids re-embedding the same query multiple times.
   */
  async searchByVector(vector: number[], n: number = 4): Promise<SearchResult[]> {
    if (!this.isLocal) {
      throw new Error('searchByVector is only supported in local mode');
    }

    await this.ensureLoaded();

    if (this.index!.getCount() === 0) {
      this.log('No items in vault to search');
      return [];
    }

    // Search index with pre-computed vector
    const searchResult = this.index!.search(vector, n);

    // Fetch items
    const results: SearchResult[] = [];
    for (let i = 0; i < searchResult.ids.length; i++) {
      const itemId = searchResult.ids[i];
      const distance = searchResult.distances[i];
      const uuid = this.mapping[String(itemId)];

      if (uuid) {
        const itemText = await this.storage!.getItemText(uuid);
        const itemMeta = await this.storage!.getItemMeta(uuid);

        if (itemText && itemMeta) {
          results.push({
            data: itemText,
            metadata: itemMeta,
            distance
          });
        }
      }
    }

    this.log(`Found ${results.length} similar items (by vector)`);
    return results;
  }

  /**
   * Search across multiple vaults simultaneously
   * 
   * @param text - Query text
   * @param n - Number of results (default 4)
   * @param vaults - Vault selector:
   *   - string: single vault name
   *   - string[]: merge results, return global top-n
   *   - Record<string, number>: minimum per vault, fill remaining globally
   * @returns Array of search results with distances
   * 
   * @example Single vault
   * ```typescript
   * const results = await vault.getSimilarFromVaults('query', 4, 'other-vault');
   * ```
   * 
   * @example Multiple vaults (merged)
   * ```typescript
   * const results = await vault.getSimilarFromVaults('query', 4, ['vault1', 'vault2']);
   * ```
   * 
   * @example Minimum per vault
   * ```typescript
   * // At least 2 from vault1, at least 1 from vault2, fill rest globally
   * const results = await vault.getSimilarFromVaults('query', 6, { vault1: 2, vault2: 1 });
   * ```
   */
  async getSimilarFromVaults(
    text: string,
    n: number = 4,
    vaults?: VaultSelector
  ): Promise<SearchResult[]> {
    if (!vaults) {
      throw new Error('vaults must be provided as a string, string[], or Record<string, number>');
    }

    if (!this.isLocal) {
      // Cloud mode
      return this.cloudStorage!.getSimilarFromVaults(text, n, vaults);
    }

    // Local mode - get embedding for query
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized. Provide openaiKey or geminiKey in config.');
    }
    const [queryVector] = await this.embeddings.embed([text]);

    // String: search a single vault
    if (typeof vaults === 'string') {
      return this.searchOtherVault(vaults, queryVector, n);
    }

    // Array: search all, merge, return global top-n
    if (Array.isArray(vaults)) {
      const allResults: SearchResult[] = [];
      
      for (const vaultName of vaults) {
        try {
          const results = await this.searchOtherVault(vaultName, queryVector, n);
          allResults.push(...results);
        } catch (error) {
          this.log(`Warning: Could not search vault "${vaultName}": ${error}`);
        }
      }
      
      // Sort by distance and return top n
      return allResults
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, n);
    }

    // Record: minimum per vault, fill remaining globally
    const minima = vaults as Record<string, number>;
    const totalMin = Object.values(minima).reduce((sum, v) => sum + v, 0);
    
    // If total minimums exceed n, adjust n
    const effectiveN = Math.max(n, totalMin);
    
    const selected: SearchResult[] = [];
    const leftovers: SearchResult[] = [];

    // Determine how many to fetch from each vault
    const fetchCount = effectiveN > totalMin ? effectiveN : undefined;

    for (const [vaultName, minCount] of Object.entries(minima)) {
      try {
        const results = await this.searchOtherVault(
          vaultName, 
          queryVector, 
          fetchCount ?? minCount
        );
        
        // Take minimum required
        const takeCount = Math.min(minCount, results.length);
        selected.push(...results.slice(0, takeCount));
        
        // Keep rest as leftovers for global fill
        if (results.length > takeCount) {
          leftovers.push(...results.slice(takeCount));
        }
      } catch (error) {
        this.log(`Warning: Could not search vault "${vaultName}": ${error}`);
      }
    }

    // Fill remaining slots with best from leftovers
    const remainingNeeded = Math.max(0, effectiveN - selected.length);
    if (remainingNeeded > 0) {
      const sortedLeftovers = leftovers
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      selected.push(...sortedLeftovers.slice(0, remainingNeeded));
    }

    return selected;
  }

  /**
   * Search another vault by name (local mode helper)
   * Temporarily loads the other vault's index for searching
   */
  private async searchOtherVault(
    vaultName: string,
    queryVector: number[],
    n: number
  ): Promise<SearchResult[]> {
    // If searching our own vault, use the loaded index
    if (vaultName === this.config.vault) {
      await this.ensureLoaded();
      if (this.index!.getCount() === 0) {
        return [];
      }
      const searchResult = this.index!.search(queryVector, n);
      return this.fetchResultItems(searchResult, this.mapping, this.storage!);
    }

    // Create temporary storage and index for the other vault
    const otherStorage = new LocalStorageManager(vaultName, this.config.localDir);
    const otherIndex = new MemoryVectorIndex(this.config.dims ?? 1536);

    // Load other vault's mapping and vectors
    const otherMapping = await otherStorage.getMapping();
    if (Object.keys(otherMapping).length === 0) {
      return [];
    }

    const vectorPaths = await otherStorage.loadVectors();
    if (!vectorPaths) {
      return [];
    }

    try {
      otherIndex.load(vectorPaths.indexPath, vectorPaths.metaPath);
    } catch (error) {
      this.log(`Warning: Could not load vectors for vault "${vaultName}": ${error}`);
      return [];
    }

    if (otherIndex.getCount() === 0) {
      return [];
    }

    // Search the other vault's index
    const searchResult = otherIndex.search(queryVector, n);
    return this.fetchResultItems(searchResult, otherMapping, otherStorage);
  }

  /**
   * Fetch items from search results
   */
  private async fetchResultItems(
    searchResult: { ids: number[]; distances: number[] },
    mapping: Record<string, string>,
    storage: LocalStorageManager
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (let i = 0; i < searchResult.ids.length; i++) {
      const itemId = searchResult.ids[i];
      const distance = searchResult.distances[i];
      const uuid = mapping[String(itemId)];
      
      if (uuid) {
        const itemText = await storage.getItemText(uuid);
        const itemMeta = await storage.getItemMeta(uuid);
        
        if (itemText && itemMeta) {
          results.push({
            data: itemText,
            metadata: itemMeta,
            distance
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Get distance between two items by ID
   */
  async getDistance(id1: number, id2: number): Promise<number> {
    if (!this.isLocal) {
      return this.cloudStorage!.getDistance(id1, id2);
    }

    await this.ensureLoaded();

    const vec1 = this.index!.getVector(id1);
    const vec2 = this.index!.getVector(id2);

    if (!vec1 || !vec2) {
      throw new Error(`Item not found: ${!vec1 ? id1 : id2}`);
    }

    // Calculate angular distance
    const dotProduct = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
    return Math.sqrt(Math.max(0, 2 * (1 - dotProduct)));
  }

  // ==================== CRUD ====================

  /**
   * Get items by IDs
   */
  async getItems(ids: number[]): Promise<Item[]> {
    if (!this.isLocal) {
      return this.cloudStorage!.getItems(ids);
    }

    await this.ensureLoaded();

    const items: Item[] = [];
    for (const id of ids) {
      const uuid = this.mapping[String(id)];
      if (uuid) {
        const itemText = await this.storage!.getItemText(uuid);
        const itemMeta = await this.storage!.getItemMeta(uuid);
        if (itemText && itemMeta) {
          items.push({
            data: itemText,
            metadata: itemMeta
          });
        }
      }
    }
    return items;
  }

  /**
   * Edit an item's text (regenerates embedding)
   */
  async editItem(id: number, newText: string): Promise<void> {
    if (!this.isLocal) {
      await this.cloudStorage!.editItem(id, newText);
      return;
    }

    await this.ensureLoaded();

    const uuid = this.mapping[String(id)];
    if (!uuid) {
      throw new Error(`Item ${id} not found`);
    }

    // Get existing metadata
    const meta = await this.storage!.getItemMeta(uuid);
    if (!meta) {
      throw new Error(`Metadata for item ${id} not found`);
    }

    // Update metadata
    meta.updated = new Date().toISOString();
    meta.time = Date.now() / 1000;

    // Generate new embedding
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized. Provide openaiKey or geminiKey in config.');
    }
    const [newVector] = await this.embeddings.embed([newText]);

    // Update storage
    await this.storage!.upload(uuid, newText, meta);

    // Rebuild index with updated vector
    this.index!.add(id, newVector);
    this.index!.build();
    
    // Save updated vectors
    const indexPath = this.storage!.getVectorsIndexPath();
    const metaPath = this.storage!.getVectorsMetaPath();
    this.index!.save(indexPath, metaPath);

    this.log(`Edited item ${id}`);
  }

  /**
   * Delete items by IDs
   */
  async deleteItems(ids: number[]): Promise<void> {
    if (!this.isLocal) {
      await this.cloudStorage!.deleteItems(ids);
      return;
    }

    await this.ensureLoaded();

    // Delete from storage and mapping
    for (const id of ids) {
      const uuid = this.mapping[String(id)];
      if (uuid) {
        await this.storage!.deleteItem(uuid);
        delete this.mapping[String(id)];
      }
    }

    // Rebuild index without deleted items
    const newIndex = new MemoryVectorIndex(this.config.dims ?? 1536);
    const newMapping: Record<string, string> = {};
    let newId = 0;

    // Get all remaining IDs in order
    const remainingIds = Object.keys(this.mapping)
      .map(Number)
      .sort((a, b) => a - b);

    for (const oldId of remainingIds) {
      const uuid = this.mapping[String(oldId)];
      const vector = this.index!.getVector(oldId);
      
      if (vector) {
        newIndex.add(newId, vector);
        newMapping[String(newId)] = uuid;
        
        // Update metadata with new ID
        const meta = await this.storage!.getItemMeta(uuid);
        if (meta) {
          meta.item_id = newId;
          const text = await this.storage!.getItemText(uuid);
          if (text) {
            await this.storage!.upload(uuid, text, meta);
          }
        }
        
        newId++;
      }
    }

    newIndex.build();

    // Replace old index and mapping
    this.index = newIndex;
    this.mapping = newMapping;
    this.nextId = newId;

    // Save
    await this.storage!.saveMapping(this.mapping);
    const indexPath = this.storage!.getVectorsIndexPath();
    const metaPath = this.storage!.getVectorsMetaPath();
    this.index.save(indexPath, metaPath);

    this.log(`Deleted ${ids.length} items, ${this.nextId} remaining`);
  }

  /**
   * Get total number of items in the vault
   */
  async getTotalItems(): Promise<number> {
    if (!this.isLocal) {
      return this.cloudStorage!.getTotalItems();
    }

    await this.ensureLoaded();
    return Object.keys(this.mapping).length;
  }

  // ==================== Vault Management ====================

  /**
   * List all vaults
   */
  async getVaults(): Promise<string[]> {
    if (!this.isLocal) {
      return this.cloudStorage!.listVaults();
    }
    return this.storage!.listVaults();
  }

  /**
   * Delete this vault entirely
   */
  async delete(): Promise<void> {
    if (!this.isLocal) {
      await this.cloudStorage!.deleteVault();
      return;
    }

    await this.storage!.deleteVault();
    this.mapping = {};
    this.pendingItems = [];
    this.nextId = 0;
    this.index = new MemoryVectorIndex(this.config.dims ?? 1536);
    this.loaded = false;
    this.log(`Vault "${this.config.vault}" deleted`);
  }

  /**
   * Create a new vault (cloud mode only - local creates on first save)
   */
  async createVault(name?: string): Promise<void> {
    if (this.isLocal) {
      this.log('Local vaults are created automatically on first save');
      return;
    }
    
    if (name) {
      const newCloud = new CloudStorageManager(
        this.config.user!,
        this.config.apiKey!,
        name,
        this.config.embeddingsModel
      );
      await newCloud.createVault();
    } else {
      await this.cloudStorage!.createVault();
    }
  }

  // ==================== Prompts ====================

  /**
   * Save personality message
   */
  async savePersonalityMessage(message: string): Promise<void> {
    if (!this.isLocal) {
      await this.cloudStorage!.savePersonalityMessage(message);
      return;
    }
    await this.storage!.savePersonalityMessage(message);
    this.log('Personality message saved');
  }

  /**
   * Get personality message
   */
  async fetchPersonalityMessage(): Promise<string> {
    if (!this.isLocal) {
      return (await this.cloudStorage!.getPersonalityMessage()) ?? '';
    }
    return (await this.storage!.getPersonalityMessage()) ?? '';
  }

  /**
   * Save custom prompt
   */
  async saveCustomPrompt(prompt: string, withContext: boolean = true): Promise<void> {
    if (!this.isLocal) {
      await this.cloudStorage!.saveCustomPrompt(prompt, withContext);
      return;
    }
    await this.storage!.saveCustomPrompt(prompt, withContext);
    this.log('Custom prompt saved');
  }

  /**
   * Get custom prompt
   */
  async fetchCustomPrompt(withContext: boolean = true): Promise<string> {
    if (!this.isLocal) {
      return (await this.cloudStorage!.getCustomPrompt(withContext)) ?? '';
    }
    return (await this.storage!.getCustomPrompt(withContext)) ?? '';
  }

  // ==================== Chat ====================

  /**
   * Get chat response with optional RAG context
   * 
   * @example Basic chat
   * ```typescript
   * const response = await vault.getChat('Hello!');
   * ```
   * 
   * @example Chat with RAG context
   * ```typescript
   * const response = await vault.getChat('What do you know about X?', {
   *   getContext: true,
   *   nContext: 4
   * });
   * ```
   * 
   * @example Get response with context returned
   * ```typescript
   * const result = await vault.getChat('Question?', {
   *   getContext: true,
   *   returnContext: true
   * });
   * // result.response, result.context
   * ```
   */
  async getChat(text: string, options?: ChatOptions): Promise<ChatResponse> {
    const {
      history = '',
      getContext = false,
      nContext = 4,
      returnContext = false,
      historySearch = false,
      smartHistorySearch = false,
      model,
      includeContextMeta = false,
      customPrompt,
      temperature,
      timeout
    } = options ?? {};

    // Cloud mode without local chat client - use cloud API
    if (!this.isLocal && !this.chatClient && this.cloudStorage) {
      return this.cloudStorage.getChat(text, { 
        history, 
        getContext, 
        nContext, 
        model, 
        temperature 
      });
    }

    // Local mode or cloud mode with local chat client
    if (!this.chatClient) {
      throw new Error('Chat requires OpenAI API key. Provide openaiKey in config.');
    }

    let response: string;
    let context: SearchResult[] = [];
    let searchInput = text;

    if (getContext) {
      // Determine search input
      if (smartHistorySearch && history) {
        // Use LLM to determine what to search for
        const searchPrompt = `Using the current message with the message history, what subject is the user focused on?\nCurrent message: ${text}\n\nPrevious messages: ${history}`;
        searchInput = await this.chatClient.llm(searchPrompt, undefined, { model, temperature, timeout });
      } else if (historySearch && history) {
        searchInput = text + ' ' + history;
      }

      // Get context from vault
      context = await this.getSimilar(searchInput, nContext);

      // Build context string
      let contextStr = includeContextMeta ? JSON.stringify(context) : '';
      for (const item of context) {
        if (item.data) {
          contextStr += item.data + '\n\n';
        }
      }

      // Get response with context
      response = await this.chatClient.llmWithContext(text, contextStr, history, {
        model,
        temperature,
        timeout,
        customPrompt
      });
    } else if (customPrompt) {
      // Custom prompt without context
      response = await this.chatClient.llm(text, history, { model, temperature, timeout, customPrompt });
    } else {
      // Simple chat
      response = await this.chatClient.llm(text, history, { model, temperature, timeout });
    }

    if (returnContext) {
      return { response, context, searchInput } as ChatResponseWithContext;
    }

    return response;
  }

  /**
   * Stream chat response with optional RAG context
   * 
   * @example Basic streaming
   * ```typescript
   * for await (const token of vault.getChatStream('Hello!')) {
   *   if (token === '!END') break;
   *   process.stdout.write(token);
   * }
   * ```
   * 
   * @example Stream with context returned
   * ```typescript
   * let fullResponse = '';
   * for await (const token of vault.getChatStream('Question?', {
   *   getContext: true,
   *   returnContext: true
   * })) {
   *   if (token === '!END') break;
   *   if (token.startsWith('{"response":')) {
   *     const data = JSON.parse(token);
   *     console.log('Context:', data.context);
   *     break;
   *   }
   *   fullResponse += token;
   *   process.stdout.write(token);
   * }
   * ```
   */
  async *getChatStream(text: string, options?: ChatOptions): AsyncGenerator<string, void, unknown> {
    const {
      history = '',
      getContext = false,
      nContext = 4,
      returnContext = false,
      historySearch = false,
      smartHistorySearch = false,
      model,
      includeContextMeta = false,
      customPrompt,
      temperature,
      timeout
    } = options ?? {};

    if (!this.chatClient) {
      throw new Error('Chat requires OpenAI API key. Provide openaiKey in config.');
    }

    let context: SearchResult[] = [];
    let searchInput = text;
    let fullResponse = '';

    if (getContext) {
      // Determine search input
      if (smartHistorySearch && history) {
        const searchPrompt = `Using the current message with the message history, what subject is the user focused on?\nCurrent message: ${text}\n\nPrevious messages: ${history}`;
        searchInput = await this.chatClient.llm(searchPrompt, undefined, { model, temperature, timeout });
      } else if (historySearch && history) {
        searchInput = text + ' ' + history;
      }

      // Get context from vault
      context = await this.getSimilar(searchInput, nContext);

      // Build context string
      let contextStr = includeContextMeta ? JSON.stringify(context) : '';
      for (const item of context) {
        if (item.data) {
          contextStr += item.data + '\n\n';
        }
      }

      // Stream response with context
      for await (const token of this.chatClient.llmWithContextStream(text, contextStr, history, {
        model,
        temperature,
        timeout,
        customPrompt
      })) {
        fullResponse += token;
        yield token;
      }
    } else {
      // Stream simple chat
      const messages = customPrompt
        ? [{ role: 'user' as const, content: customPrompt.replace('{content}', text) }]
        : this.chatClient['buildSimpleMessages'](text, history);

      for await (const token of this.chatClient.chatStream(messages, { model, temperature, timeout })) {
        fullResponse += token;
        yield token;
      }
    }

    // If returnContext, yield JSON payload before END
    if (returnContext && getContext) {
      yield JSON.stringify({ response: fullResponse, context, searchInput });
    }

    yield '!END';
  }

  /**
   * Helper to print a chat stream and collect the full response
   * 
   * @example
   * ```typescript
   * const response = await vault.printStream(
   *   vault.getChatStream('Hello!', { getContext: true })
   * );
   * console.log('\nFull response:', response);
   * ```
   */
  async printStream(stream: AsyncGenerator<string, void, unknown>, printing: boolean = true): Promise<string> {
    let fullResponse = '';
    let contextData: ChatResponseWithContext | null = null;

    for await (const token of stream) {
      if (token === '!END') break;

      // Check for JSON context payload
      if (token.startsWith('{"response":')) {
        try {
          contextData = JSON.parse(token) as ChatResponseWithContext;
          continue;
        } catch {
          // Not valid JSON, treat as normal token
        }
      }

      fullResponse += token;
      if (printing) {
        process.stdout.write(token);
      }
    }

    if (printing) {
      process.stdout.write('\n');
    }

    return fullResponse;
  }

  // ==================== Cloud Flows ====================

  /**
   * Execute a cloud flow and return the full response
   * 
   * Cloud flows are pre-configured AI workflows in VectorVault Cloud.
   * This method is only available in cloud mode.
   * 
   * @example Basic flow execution
   * ```typescript
   * const response = await vault.runFlow('my-assistant', 'Hello!');
   * console.log(response);
   * ```
   * 
   * @example With options
   * ```typescript
   * const response = await vault.runFlow('my-assistant', 'Tell me more', {
   *   history: 'User: Hi\nAssistant: Hello! How can I help?',
   *   internalVars: { userId: '123' }
   * });
   * ```
   * 
   * @param flowName - Name of the flow to execute
   * @param message - Message to send to the flow
   * @param options - Additional options (history, invokeMethod, internalVars, imageUrl)
   * @returns Full response from the flow execution
   * @throws Error if called in local mode
   */
  async runFlow(flowName: string, message: string, options?: FlowOptions): Promise<string> {
    if (this.isLocal) {
      throw new Error(
        'Cloud flows require cloud mode. ' +
        'Use cloud mode or call LLM directly with getChat().'
      );
    }

    return this.cloudStorage!.runFlow(flowName, message, options);
  }

  /**
   * Execute a cloud flow and stream the response
   * 
   * Cloud flows are pre-configured AI workflows in VectorVault Cloud.
   * This method is only available in cloud mode.
   * 
   * @example Streaming flow
   * ```typescript
   * for await (const token of vault.streamFlow('my-assistant', 'Hello!')) {
   *   process.stdout.write(token);
   * }
   * ```
   * 
   * @example With history
   * ```typescript
   * let response = '';
   * for await (const token of vault.streamFlow('my-assistant', 'Continue', {
   *   history: previousConversation
   * })) {
   *   response += token;
   *   process.stdout.write(token);
   * }
   * ```
   * 
   * @param flowName - Name of the flow to execute
   * @param message - Message to send to the flow
   * @param options - Additional options (history, invokeMethod, internalVars, imageUrl)
   * @yields Stream tokens from the flow execution
   * @throws Error if called in local mode
   */
  async *streamFlow(flowName: string, message: string, options?: FlowOptions): AsyncGenerator<string, void, unknown> {
    if (this.isLocal) {
      throw new Error(
        'Cloud flows require cloud mode. ' +
        'Use cloud mode or call LLM directly with getChatStream().'
      );
    }

    yield* this.cloudStorage!.streamFlow(flowName, message, options);
  }

  // ==================== Import/Export ====================

  /**
   * Export all vault items to JSON
   * 
   * @example Basic export
   * ```typescript
   * const json = await vault.downloadToJson();
   * fs.writeFileSync('backup.json', json);
   * ```
   * 
   * @example Export with metadata
   * ```typescript
   * const json = await vault.downloadToJson(true);
   * const data = JSON.parse(json);
   * console.log(data['0'].metadata); // { name: '...', item_id: 0, ... }
   * ```
   * 
   * @param includeMeta - Include metadata in export (default: false)
   * @returns JSON string of all items
   */
  async downloadToJson(includeMeta: boolean = false): Promise<string> {
    if (!this.isLocal) {
      return this.cloudStorage!.downloadToJson(includeMeta);
    }

    await this.ensureLoaded();

    const results: Record<string, { data: string; metadata?: ItemMetadata }> = {};
    
    // Get all items by their IDs
    const itemIds = Object.keys(this.mapping).map(Number).sort((a, b) => a - b);
    
    for (const itemId of itemIds) {
      const uuid = this.mapping[String(itemId)];
      if (uuid) {
        const itemText = await this.storage!.getItemText(uuid);
        const itemMeta = await this.storage!.getItemMeta(uuid);
        
        if (itemText) {
          if (includeMeta && itemMeta) {
            results[String(itemId)] = { data: itemText, metadata: itemMeta };
          } else {
            results[String(itemId)] = { data: itemText };
          }
        }
      }
    }

    this.log(`Exported ${Object.keys(results).length} items to JSON`);
    return JSON.stringify(results);
  }

  /**
   * Import items from JSON (replaces vault contents)
   * 
   * WARNING: This will delete all existing items in the vault!
   * 
   * @example Import from JSON string
   * ```typescript
   * const json = fs.readFileSync('backup.json', 'utf-8');
   * await vault.uploadFromJson(json);
   * ```
   * 
   * @example Import from object
   * ```typescript
   * const data = {
   *   '0': { data: 'First item' },
   *   '1': { data: 'Second item', metadata: { category: 'test' } }
   * };
   * await vault.uploadFromJson(data);
   * ```
   * 
   * @param jsonData - JSON string or object with items
   */
  async uploadFromJson(jsonData: string | Record<string, { data: string; metadata?: Partial<ItemMetadata> }>): Promise<void> {
    // Parse JSON if string
    let items: Record<string, { data: string; metadata?: Partial<ItemMetadata> }>;
    
    if (typeof jsonData === 'string') {
      try {
        let parsed = JSON.parse(jsonData);
        // Handle double-wrapped JSON
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        items = parsed;
      } catch (error) {
        throw new Error(`Failed to parse JSON: ${error}`);
      }
    } else {
      items = jsonData;
    }

    if (typeof items !== 'object' || items === null) {
      throw new Error('Invalid JSON format: expected object');
    }

    this.log('Deleting existing items...');
    
    // Delete existing items
    const existingCount = await this.getTotalItems();
    if (existingCount > 0) {
      const existingIds = Array.from({ length: existingCount }, (_, i) => i);
      await this.deleteItems(existingIds);
    }

    this.log(`Importing ${Object.keys(items).length} items...`);

    // Add new items
    const sortedKeys = Object.keys(items).sort((a, b) => Number(a) - Number(b));
    for (const key of sortedKeys) {
      const item = items[key];
      if (!item.data) {
        this.log(`Skipping item ${key}: no data field`);
        continue;
      }
      this.add(item.data, item.metadata);
    }

    // Generate embeddings and save
    await this.getVectors();
    await this.save();

    this.log(`Successfully imported ${sortedKeys.length} items`);
  }

  // ==================== Vault Cloning ====================

  /**
   * Clone this vault with all items to a new vault
   * 
   * @example
   * ```typescript
   * const newVault = await vault.duplicateVault('backup_vault');
   * console.log(await newVault.getTotalItems()); // Same as original
   * ```
   * 
   * @param newVaultName - Name for the new vault
   * @returns New Vault instance with all items copied
   */
  async duplicateVault(newVaultName: string): Promise<Vault> {
    this.log(`Duplicating vault to "${newVaultName}"...`);

    // Create new vault with same config
    const newVault = new Vault({
      ...this.config,
      vault: newVaultName
    });

    // Get total items
    const totalItems = await this.getTotalItems();
    
    if (totalItems === 0) {
      this.log('No items to duplicate');
      return newVault;
    }

    // Copy all items
    for (let i = 0; i < totalItems; i++) {
      const items = await this.getItems([i]);
      if (items.length > 0) {
        const item = items[0];
        newVault.add(item.data, item.metadata);
      }
      if (this.verbose && (i + 1) % 10 === 0) {
        this.log(`Copied ${i + 1}/${totalItems} items`);
      }
    }

    // Generate embeddings and save
    await newVault.getVectors();
    await newVault.save();

    // Copy prompts
    const personality = await this.fetchPersonalityMessage();
    if (personality) {
      await newVault.savePersonalityMessage(personality);
    }

    const promptWithContext = await this.fetchCustomPrompt(true);
    if (promptWithContext) {
      await newVault.saveCustomPrompt(promptWithContext, true);
    }

    const promptNoContext = await this.fetchCustomPrompt(false);
    if (promptNoContext) {
      await newVault.saveCustomPrompt(promptNoContext, false);
    }

    this.log(`Duplicated ${totalItems} items to "${newVaultName}"`);
    return newVault;
  }

  // ==================== Cache Management ====================

  /**
   * Pre-load all items into memory for faster access
   * 
   * Useful before running many searches or operations on the vault.
   * In local mode, this loads all item text and metadata into the storage cache.
   * 
   * @example
   * ```typescript
   * // Preload before batch operations
   * await vault.preloadCache();
   * 
   * // Now searches will be faster
   * for (const query of queries) {
   *   const results = await vault.getSimilar(query);
   * }
   * ```
   * 
   * @param maxConcurrent - Maximum concurrent loads (default: 10)
   */
  async preloadCache(maxConcurrent: number = 10): Promise<void> {
    if (!this.isLocal) {
      return this.cloudStorage!.preloadCache(maxConcurrent);
    }

    await this.ensureLoaded();

    const uuids = Object.values(this.mapping);
    this.log(`Preloading ${uuids.length} items with ${maxConcurrent} workers...`);

    // Process in batches to control concurrency
    for (let i = 0; i < uuids.length; i += maxConcurrent) {
      const batch = uuids.slice(i, i + maxConcurrent);
      await Promise.all(batch.map(async (uuid) => {
        try {
          // These calls populate the internal cache
          await this.storage!.getItemText(uuid);
          await this.storage!.getItemMeta(uuid);
        } catch (error) {
          this.log(`Failed to preload item ${uuid}: ${error}`);
        }
      }));
    }

    this.log(`Preloaded ${uuids.length} items into cache`);
  }

  // ==================== Utilities ====================

  /**
   * Split text into chunks
   */
  splitText(text: string, minChunk: number = 1000, maxChunk: number = 16000): string[] {
    const segments: string[] = [];
    const sentenceSpans = [...text.matchAll(/(?<=[.!?])\s+/g)];
    
    let currentSegment: string[] = [];
    let currentLength = 0;
    let sentenceStart = 0;

    for (const span of sentenceSpans) {
      const sentence = text.slice(sentenceStart, span.index! + span[0].length);

      if (currentLength + sentence.length > maxChunk) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment.join(' '));
        }
        currentSegment = [sentence];
        currentLength = sentence.length;
      } else {
        currentSegment.push(sentence);
        currentLength += sentence.length;
      }

      if (currentLength >= minChunk) {
        segments.push(currentSegment.join(' '));
        currentSegment = [];
        currentLength = 0;
      }

      sentenceStart = span.index! + span[0].length;
    }

    // Handle remaining text
    const lastSentence = text.slice(sentenceStart);
    if (lastSentence) {
      currentSegment.push(lastSentence);
    }

    if (currentSegment.length > 0 && (currentLength >= minChunk || segments.length === 0)) {
      segments.push(currentSegment.join(' '));
    }

    return segments;
  }

  /**
   * Get vector for an item by ID (local mode only)
   */
  getItemVector(itemId: number): number[] | null {
    if (!this.isLocal || !this.index) {
      return null;
    }
    return this.index.getVector(itemId);
  }

  /**
   * Check if vault is in local mode
   */
  isLocalMode(): boolean {
    return this.isLocal;
  }
}
