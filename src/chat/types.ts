/**
 * Chat Module Types
 * 
 * Type definitions for LLM chat functionality.
 */

import type { SearchResult } from '../types.js';

/**
 * Options for chat requests
 */
export interface ChatOptions {
  /** Conversation history to include */
  history?: string;
  /** Whether to retrieve context from vault before responding */
  getContext?: boolean;
  /** Number of context items to retrieve (default: 4) */
  nContext?: number;
  /** Whether to return the context along with response */
  returnContext?: boolean;
  /** Whether to include chat history in vector search */
  historySearch?: boolean;
  /** Use LLM to determine search query from history */
  smartHistorySearch?: boolean;
  /** Model to use for chat (e.g., 'gpt-4o', 'gpt-4o-mini') */
  model?: string;
  /** Whether to include metadata in context sent to LLM */
  includeContextMeta?: boolean;
  /** Custom prompt template. Use {content} for user input, {context} for RAG context */
  customPrompt?: string;
  /** Temperature for response generation (0-2, default: 0) */
  temperature?: number;
  /** Request timeout in milliseconds (default: 300000) */
  timeout?: number;
}

/**
 * Response from chat when returnContext is true
 */
export interface ChatResponseWithContext {
  /** The LLM response text */
  response: string;
  /** Context items retrieved from vault */
  context: SearchResult[];
  /** The actual search query used (may differ if smartHistorySearch) */
  searchInput?: string;
}

/**
 * Chat response type - string if returnContext=false, object if true
 */
export type ChatResponse = string | ChatResponseWithContext;

/**
 * Message format for chat completions
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for the LLM client
 */
export interface LLMClientOptions {
  /** API key for the provider */
  apiKey: string;
  /** Base URL for API calls (optional) */
  baseUrl?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Default temperature */
  defaultTemperature?: number;
  /** Default timeout in ms */
  defaultTimeout?: number;
}

/**
 * Request options for LLM calls
 */
export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  timeout?: number;
  maxTokens?: number;
}

/**
 * Streaming chunk from LLM
 */
export interface StreamChunk {
  content: string;
  done: boolean;
}
