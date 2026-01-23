/**
 * Chat Module
 * 
 * LLM integrations for VectorVault.
 * Provides chat functionality with optional RAG context retrieval.
 */

export { LLMClient } from './client.js';
export { OpenAIChatClient } from './openai.js';

export type {
  ChatOptions,
  ChatResponse,
  ChatResponseWithContext,
  ChatMessage,
  LLMClientOptions,
  LLMRequestOptions,
  StreamChunk
} from './types.js';
