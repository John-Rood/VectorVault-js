/**
 * VectorVault - TypeScript
 * 
 * A local-first vector database for AI applications.
 * First library to offer native FAISS-powered local vector search in TypeScript.
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
  PendingItem
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
export { LLMClient, OpenAIChatClient } from './chat/index.js';

// Components (for advanced usage)
export { FAISSIndex } from './vectors/faiss.js';
export { LocalStorageManager } from './storage/local.js';
export { CloudStorageManager } from './storage/cloud.js';
export { OpenAIEmbeddings } from './embeddings/openai.js';
