/**
 * Chat Module
 * 
 * LLM integrations for VectorVault.
 * Provides chat functionality with optional RAG context retrieval.
 */

export { LLMClient } from './client.js';
export { OpenAIChatClient } from './openai.js';
export { AnthropicChatClient } from './anthropic.js';
export { GeminiChatClient } from './gemini.js';
export { GrokChatClient } from './grok.js';

export type {
  ChatOptions,
  ChatResponse,
  ChatResponseWithContext,
  ChatMessage,
  LLMClientOptions,
  LLMRequestOptions,
  StreamChunk
} from './types.js';
