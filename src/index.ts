/**
 * VectorVault - TypeScript
 *
 * A local-first vector database for AI applications.
 * Pure TypeScript vector search with no native dependencies.
 * Also supports VectorVault Cloud for managed storage.
 * 
 * @example Local Mode
 * ```typescript
 * import { Vault } from 'vectorvault';
 * 
 * const vault = new Vault({
 *   vault: 'my_knowledge_base',
 *   openaiKey: process.env.OPENAI_API_KEY,
 *   local: true
 * });
 * 
 * // Add documents
 * vault.add('The mitochondria is the powerhouse of the cell');
 * vault.add('Neural networks are inspired by biological brains');
 * await vault.getVectors();
 * await vault.save();
 * 
 * // Search
 * const results = await vault.getSimilar('How do AI systems learn?');
 * console.log(results[0].data);
 * // → "Neural networks are inspired by biological brains"
 * ```
 * 
 * @example Cloud Mode
 * ```typescript
 * import { Vault } from 'vectorvault';
 * 
 * const vault = new Vault({
 *   vault: 'my_cloud_vault',
 *   user: 'your@email.com',
 *   apiKey: 'vv_your_api_key',
 *   local: false
 * });
 * 
 * // Add documents (embeddings generated in cloud)
 * vault.add('Important document content');
 * await vault.getVectors();  // Prepares for upload
 * await vault.save();        // Uploads to cloud
 * 
 * // RAG Chat
 * const response = await vault.getChat('What is in my documents?', {
 *   getContext: true,
 *   nContext: 4
 * });
 * ```
 */

// Main class
export { Vault } from './vault.js';

// Types
export type {
  VaultConfig,
  Item,
  ItemMetadata,
  SearchResult,
  VectorSearchResult,
  StorageManager,
  VectorIndex,
  EmbeddingsProvider,
  PendingItem,
  VaultSelector
} from './types.js';

// Chat types
export type {
  ChatOptions,
  ChatResponse,
  ChatResponseWithContext,
  ChatMessage,
  LLMClientOptions,
  LLMRequestOptions,
  FlowOptions
} from './chat/types.js';

// Chat clients (for advanced usage)
export { LLMClient, OpenAIChatClient, AnthropicChatClient } from './chat/index.js';

// Components (for advanced usage)
export { MemoryVectorIndex, isMemoryIndexAvailable } from './vectors/memory.js';
export { LocalStorageManager } from './storage/local.js';
export type { VectorMeta, VectorMetaItem } from './storage/local.js';
export { CloudStorageManager } from './storage/cloud.js';
export { OpenAIEmbeddings } from './embeddings/openai.js';
export { GeminiEmbeddings } from './embeddings/gemini.js';

// Utilities
export { RateLimiter, sleep } from './utils/index.js';
