/**
 * Cloud Storage Manager
 * 
 * Stores vault data in VectorVault cloud infrastructure.
 * Handles authentication, token refresh, and all API operations.
 */

import type { StorageManager, ItemMetadata } from '../types.js';
import type { FlowOptions } from '../chat/types.js';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

interface ErrorResponse {
  error?: string;
  message?: string;
}

export class CloudStorageManager implements StorageManager {
  private baseUrl = 'https://api.vectorvault.io';
  private vectorUrl = 'https://vectors.vectorvault.io';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private user: string;
  private apiKey: string;
  private vault: string;
  private embeddingsModel: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(user: string, apiKey: string, vault: string, embeddingsModel: string = 'text-embedding-3-small') {
    this.user = user.toLowerCase();
    this.apiKey = apiKey;
    this.vault = vault;
    this.embeddingsModel = embeddingsModel;
  }

  // ==================== Authentication ====================

  /**
   * Initialize authentication with VectorVault API
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.initialized && this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.authenticate();
    await this.initPromise;
    this.initPromise = null;
  }

  /**
   * Authenticate with the VectorVault API
   */
  private async authenticate(): Promise<void> {
    const url = `${this.baseUrl}/login`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: this.user,
        password: this.apiKey // API key is used as password
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Authentication failed: ${error.error ?? error.message ?? response.statusText}`);
    }

    const data = await response.json() as AuthResponse;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    // Decode JWT to get expiration
    const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
    this.tokenExpiresAt = payload.exp * 1000;
    this.initialized = true;
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    const url = `${this.baseUrl}/refresh`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.refreshToken}`
        }
      });

      if (!response.ok) {
        this.accessToken = null;
        this.refreshToken = null;
        this.initialized = false;
        return false;
      }

      const data = await response.json() as { access_token: string };
      this.accessToken = data.access_token;

      // Update expiration
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      this.tokenExpiresAt = payload.exp * 1000;
      return true;
    } catch {
      this.accessToken = null;
      this.refreshToken = null;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Make an authenticated request with automatic token refresh
   */
  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}, maxRetries = 2): Promise<Response> {
    await this.ensureAuthenticated();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check if token needs refresh
      if (Date.now() > this.tokenExpiresAt - 60000) {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          await this.authenticate();
        }
      }

      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${this.accessToken}`);
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          await this.authenticate();
        }
        continue;
      }

      if (response.status === 404 && attempt < maxRetries) {
        await this.refreshAccessToken();
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Request failed: ${error.error ?? error.message ?? response.statusText}`);
    }

    throw new Error('Request failed after retries');
  }

  // ==================== Item Operations ====================

  /**
   * Upload an item (text + metadata) to the vault
   * Uses add_cloud endpoint
   */
  async upload(uuid: string, text: string, meta: ItemMetadata): Promise<void> {
    const url = `${this.baseUrl}/add_cloud`;

    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        embeddings_model: this.embeddingsModel,
        text: text,
        meta: { ...meta, uuid },
        name: meta.name,
        split: false
      })
    });
  }

  /**
   * Download text content (not typically used in cloud mode)
   */
  async downloadText(path: string): Promise<string | null> {
    // In cloud mode, items are fetched via getItems API
    // This is a fallback that returns null
    return null;
  }

  /**
   * Delete an item by its ID
   */
  async deleteItem(uuid: string): Promise<void> {
    // In cloud mode, we need the item_id, not uuid
    // This method is typically called after we have the item_id
    // For now, this is a no-op as deletion is handled by deleteItems
  }

  /**
   * Check if an item exists (cloud API doesn't have direct equivalent)
   */
  async itemExists(uuid: string): Promise<boolean> {
    // Would need to implement via get_items or search
    return true;
  }

  /**
   * Get item text by UUID (proxy to cloud API)
   */
  async getItemText(uuid: string): Promise<string | null> {
    return null; // Cloud mode uses different API patterns
  }

  /**
   * Get item metadata by UUID (proxy to cloud API)
   */
  async getItemMeta(uuid: string): Promise<ItemMetadata | null> {
    return null; // Cloud mode uses different API patterns
  }

  // ==================== Mapping Operations ====================

  /**
   * Get the item mapping (id -> uuid)
   * In cloud mode, this is managed server-side
   */
  async getMapping(): Promise<Record<string, string>> {
    // Cloud mode manages mapping internally
    // We can reconstruct from get_items if needed
    return {};
  }

  /**
   * Save the item mapping
   * In cloud mode, this is managed server-side
   */
  async saveMapping(mapping: Record<string, string>): Promise<void> {
    // Cloud mode manages mapping internally
  }

  // ==================== Vector Operations ====================

  /**
   * Save vectors (handled by cloud API automatically)
   */
  async saveVectors(indexPath: string, metaPath: string): Promise<void> {
    // Cloud mode handles vectors automatically when adding items
  }

  /**
   * Load vectors (handled by cloud API automatically)
   */
  async loadVectors(): Promise<{ indexPath: string; metaPath: string } | null> {
    // Cloud mode handles vectors server-side
    return null;
  }

  // ==================== Vault Operations ====================

  /**
   * List all vaults for the user
   */
  async listVaults(): Promise<string[]> {
    const url = `${this.vectorUrl}/vaults-list`;
    const response = await this.makeAuthenticatedRequest(url, { method: 'GET' });
    const data = await response.json() as { vaults: string[] };
    return data.vaults ?? [];
  }

  /**
   * Delete the entire vault
   */
  async deleteVault(): Promise<void> {
    const url = `${this.baseUrl}/delete_vault`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({ vault: this.vault })
    });
  }

  /**
   * Create a new vault
   */
  async createVault(): Promise<void> {
    const url = `${this.baseUrl}/create_vault`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({ vault: this.vault })
    });
  }

  // ==================== High-Level Item Operations ====================

  /**
   * Get total number of items in the vault
   */
  async getTotalItems(): Promise<number> {
    const url = `${this.baseUrl}/get_total_items`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({ vault: this.vault })
    });
    const data = await response.json() as { total_items?: number };
    return data.total_items ?? 0;
  }

  /**
   * Get items by their IDs
   */
  async getItems(itemIds: number[]): Promise<Array<{ data: string; metadata: ItemMetadata }>> {
    const url = `${this.baseUrl}/get_items`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        item_ids: itemIds
      })
    });
    const data = await response.json() as Array<{ data: string; metadata: ItemMetadata }>;
    return data;
  }

  /**
   * Edit an item's text
   */
  async editItem(itemId: number, newText: string): Promise<void> {
    const url = `${this.baseUrl}/edit_item`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        embeddings_model: this.embeddingsModel,
        vault: this.vault,
        item_id: itemId,
        text: newText
      })
    });
  }

  /**
   * Delete items by their IDs
   */
  async deleteItems(itemIds: number[]): Promise<void> {
    const url = `${this.baseUrl}/delete_items`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        item_ids: itemIds
      })
    });
  }

  /**
   * Add text to the vault with cloud processing
   */
  async addCloud(text: string, meta?: Partial<ItemMetadata>, options?: {
    split?: boolean;
    splitSize?: number;
    name?: string;
  }): Promise<void> {
    const url = `${this.baseUrl}/add_cloud`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        embeddings_model: this.embeddingsModel,
        text,
        meta: meta ?? null,
        name: options?.name ?? null,
        split: options?.split ?? false,
        split_size: options?.splitSize ?? 1000
      })
    });
  }

  /**
   * Get similar items via vector search
   */
  async getSimilar(text: string, n: number = 4, includeDistances: boolean = true): Promise<Array<{
    data: string;
    metadata: ItemMetadata;
    distance?: number;
  }>> {
    const url = `${this.baseUrl}/get_similar`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        embeddings_model: this.embeddingsModel,
        vault: this.vault,
        text,
        num_items: n,
        include_distances: includeDistances
      })
    });
    const data = await response.json() as Array<{ data: string; metadata: ItemMetadata; distance?: number }>;
    return data;
  }

  /**
   * Search across multiple vaults simultaneously
   * 
   * @param text - Query text
   * @param n - Number of results
   * @param vaults - Vault selector (string, string[], or Record<string, number>)
   * @returns Array of search results with distances
   */
  async getSimilarFromVaults(
    text: string,
    n: number = 4,
    vaults: string | string[] | Record<string, number>
  ): Promise<Array<{ data: string; metadata: ItemMetadata; distance?: number }>> {
    const url = `${this.baseUrl}/get_similar_from_vaults`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        embeddings_model: this.embeddingsModel,
        text,
        num_items: n,
        vaults
      })
    });
    const data = await response.json() as Array<{ data: string; metadata: ItemMetadata; distance?: number }>;
    return data;
  }

  /**
   * Get distance between two items
   */
  async getDistance(id1: number, id2: number): Promise<number> {
    const url = `${this.baseUrl}/get_distance`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        id1,
        id2
      })
    });
    const data = await response.json() as { distance: number } | number;
    return typeof data === 'number' ? data : data.distance;
  }

  // ==================== Prompts & Personality ====================

  /**
   * Save personality message
   */
  async savePersonalityMessage(message: string): Promise<void> {
    const url = `${this.baseUrl}/save_personality_message`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        personality_message: message
      })
    });
  }

  /**
   * Get personality message
   */
  async getPersonalityMessage(): Promise<string | null> {
    const url = `${this.baseUrl}/fetch_personality_message`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({ vault: this.vault })
    });
    const data = await response.json() as { personality_message?: string } | string;
    if (typeof data === 'string') return data;
    return data.personality_message ?? null;
  }

  /**
   * Save custom prompt
   */
  async saveCustomPrompt(prompt: string, withContext: boolean): Promise<void> {
    const url = `${this.baseUrl}/save_custom_prompt`;
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        prompt,
        context: withContext
      })
    });
  }

  /**
   * Get custom prompt
   */
  async getCustomPrompt(withContext: boolean): Promise<string | null> {
    const url = `${this.baseUrl}/fetch_custom_prompt`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        context: withContext
      })
    });
    const data = await response.json() as { prompt?: string; custom_prompt?: string } | string;
    if (typeof data === 'string') return data;
    return data.prompt ?? data.custom_prompt ?? null;
  }

  // ==================== Chat Operations ====================

  /**
   * Get chat response (optionally with RAG context)
   */
  async getChat(text: string, options?: {
    history?: string;
    getContext?: boolean;
    nContext?: number;
    model?: string;
    temperature?: number;
  }): Promise<string> {
    const url = `${this.baseUrl}/get_chat`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        embeddings_model: this.embeddingsModel,
        text,
        history: options?.history ?? null,
        get_context: options?.getContext ?? false,
        n_context: options?.nContext ?? 4,
        model: options?.model ?? 'gpt-4o',
        temperature: options?.temperature ?? 0
      })
    });
    const data = await response.json() as { response?: string } | string;
    if (typeof data === 'string') return data;
    return data.response ?? '';
  }

  // ==================== Flow Operations ====================

  /**
   * Execute a cloud flow and return the full response
   * 
   * @param flowName - Name of the flow to execute
   * @param message - Message to send to the flow
   * @param options - Additional options (history, invokeMethod, internalVars, imageUrl)
   * @returns Full response from the flow execution
   */
  async runFlow(flowName: string, message: string, options?: FlowOptions): Promise<string> {
    const url = `${this.baseUrl}/flow`;
    
    const body: Record<string, unknown> = {
      flow_id: flowName,
      message,
      history: options?.history ?? '',
    };

    // Add optional parameters if provided
    if (options?.invokeMethod !== undefined) {
      body.invoke_method = options.invokeMethod;
    }
    if (options?.internalVars !== undefined) {
      body.internal_vars = options.internalVars;
    }
    if (options?.imageUrl !== undefined) {
      body.image_url = options.imageUrl;
    }

    // Pass through any additional options (kwargs equivalent)
    for (const [key, value] of Object.entries(options ?? {})) {
      if (!['history', 'invokeMethod', 'internalVars', 'imageUrl'].includes(key)) {
        body[key] = value;
      }
    }

    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    const data = await response.json() as { response?: string } | string;
    if (typeof data === 'string') return data;
    return data.response ?? '';
  }

  /**
   * Execute a cloud flow and stream the response
   * 
   * @param flowName - Name of the flow to execute
   * @param message - Message to send to the flow
   * @param options - Additional options (history, invokeMethod, internalVars, imageUrl)
   * @yields Stream tokens from the flow execution
   */
  async *streamFlow(flowName: string, message: string, options?: FlowOptions): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/flow-stream`;
    
    const body: Record<string, unknown> = {
      flow_id: flowName,
      message,
      history: options?.history ?? '',
    };

    // Add optional parameters if provided
    if (options?.invokeMethod !== undefined) {
      body.invoke_method = options.invokeMethod;
    }
    if (options?.internalVars !== undefined) {
      body.internal_vars = options.internalVars;
    }
    if (options?.imageUrl !== undefined) {
      body.image_url = options.imageUrl;
    }

    // Pass through any additional options
    for (const [key, value] of Object.entries(options ?? {})) {
      if (!['history', 'invokeMethod', 'internalVars', 'imageUrl'].includes(key)) {
        body[key] = value;
      }
    }

    await this.ensureAuthenticated();

    // Check if token needs refresh
    if (Date.now() > this.tokenExpiresAt - 60000) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        await this.authenticate();
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Flow stream request failed: ${error.error ?? error.message ?? response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events (data: ...\n\n format)
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              try {
                const data = JSON.parse(jsonStr) as { data?: string };
                if (data.data) {
                  if (data.data === '!END') {
                    return;
                  }
                  yield data.data;
                }
              } catch {
                // Not valid JSON, yield as raw token
                yield jsonStr;
              }
            }
          } else if (line.startsWith('event: done')) {
            return;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ==================== Import/Export ====================

  /**
   * Export all vault items to JSON
   * 
   * @param includeMeta - Include metadata in export
   * @returns JSON string of all items
   */
  async downloadToJson(includeMeta: boolean = false): Promise<string> {
    const url = `${this.baseUrl}/download_to_json`;
    const response = await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        return_meta: includeMeta
      })
    });
    const data = await response.json() as string | Record<string, unknown>;
    
    // API may return JSON string or object
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data);
  }

  /**
   * Import items from JSON (replaces vault contents)
   * 
   * @param jsonData - JSON string or object with items
   */
  async uploadFromJson(jsonData: string | Record<string, { data: string; metadata?: Record<string, unknown> }>): Promise<void> {
    const url = `${this.baseUrl}/upload_from_json`;
    
    // Ensure we send a string
    const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
    
    await this.makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        vault: this.vault,
        embeddings_model: this.embeddingsModel,
        json_data: jsonString
      })
    });
  }

  // ==================== Cache Management ====================

  /**
   * Pre-load all items into memory for faster access
   * In cloud mode, this fetches all items to warm the server cache
   * 
   * @param maxConcurrent - Maximum concurrent loads (not used in cloud mode)
   */
  async preloadCache(maxConcurrent: number = 10): Promise<void> {
    // In cloud mode, we can warm the cache by fetching items in batches
    const total = await this.getTotalItems();
    
    if (total === 0) return;

    const batchSize = Math.min(maxConcurrent * 10, 100);
    
    for (let i = 0; i < total; i += batchSize) {
      const ids = Array.from(
        { length: Math.min(batchSize, total - i) }, 
        (_, j) => i + j
      );
      await this.getItems(ids);
    }
  }

  // ==================== Accessors ====================

  getVaultName(): string {
    return this.vault;
  }

  getUser(): string {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.initialized && !!this.accessToken;
  }
}
