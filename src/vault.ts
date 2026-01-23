/**
 * VectorVault - Main Vault Class
 * 
 * A local-first vector database for AI applications.
 * Uses FAISS for efficient similarity search in local mode,
 * or VectorVault Cloud API for cloud mode.
 */

import { randomUUID } from 'node:crypto';
import type { 
  VaultConfig, 
  Item, 
  ItemMetadata, 
  SearchResult, 
  PendingItem,
  EmbeddingsProvider 
} from './types.js';
import { FAISSIndex } from './vectors/faiss.js';
import { LocalStorageManager } from './storage/local.js';
import { CloudStorageManager } from './storage/cloud.js';
import { OpenAIEmbeddings } from './embeddings/openai.js';
import { OpenAIChatClient } from './chat/openai.js';
import type { ChatOptions, ChatResponse, ChatResponseWithContext, FlowOptions } from './chat/types.js';

export class Vault {
  private config: VaultConfig;
  private storage: LocalStorageManager | null = null;
  private cloudStorage: CloudStorageManager | null = null;
  private index: FAISSIndex | null = null;
  private embeddings: EmbeddingsProvider | null = null;
  private chatClient: OpenAIChatClient | null = null;
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
      if (!this.config.openaiKey) {
        throw new Error('OpenAI API key is required (openaiKey)');
      }

      this.storage = new LocalStorageManager(this.config.vault, this.config.localDir);
      this.index = new FAISSIndex(this.config.dims);
      this.embeddings = new OpenAIEmbeddings(
        this.config.openaiKey,
        this.config.embeddingsModel
      );

      // Initialize chat client for local mode
      this.chatClient = new OpenAIChatClient({
        apiKey: this.config.openaiKey,
        defaultModel: this.config.chatModel ?? 'gpt-4o-mini',
        defaultTemperature: this.config.chatTemperature ?? 0
      });
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

      // OpenAI key is optional in cloud mode (cloud handles embeddings)
      if (this.config.openaiKey) {
        this.embeddings = new OpenAIEmbeddings(
          this.config.openaiKey,
          this.config.embeddingsModel
        );

        // Initialize chat client for cloud mode with local LLM calls
        this.chatClient = new OpenAIChatClient({
          apiKey: this.config.openaiKey,
          defaultModel: this.config.chatModel ?? 'gpt-4o-mini',
          defaultTemperature: this.config.chatTemperature ?? 0
        });
      }
    }

    this.log(`Vault "${this.config.vault}" initialized (${this.isLocal ? 'local' : 'cloud'} mode)`);
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
    const texts = this.pendingItems.map(item => item.text);
    const vectors = await this.embeddings!.embed(texts);

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
    const queryVector = await this.embeddings!.embed([text]);
    
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
    const [newVector] = await this.embeddings!.embed([newText]);

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
    const newIndex = new FAISSIndex(this.config.dims ?? 1536);
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
    this.index = new FAISSIndex(this.config.dims ?? 1536);
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
