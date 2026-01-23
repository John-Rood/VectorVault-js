/**
 * Abstract LLM Client
 * 
 * Base class for LLM providers (OpenAI, Anthropic, etc.)
 */

import type { ChatMessage, LLMClientOptions, LLMRequestOptions } from './types.js';

export abstract class LLMClient {
  protected apiKey: string;
  protected baseUrl: string;
  protected defaultModel: string;
  protected defaultTemperature: number;
  protected defaultTimeout: number;

  constructor(options: LLMClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? '';
    this.defaultModel = options.defaultModel ?? '';
    this.defaultTemperature = options.defaultTemperature ?? 0;
    this.defaultTimeout = options.defaultTimeout ?? 300000;
  }

  /**
   * Send a chat completion request
   */
  abstract chat(messages: ChatMessage[], options?: LLMRequestOptions): Promise<string>;

  /**
   * Stream a chat completion
   */
  abstract chatStream(messages: ChatMessage[], options?: LLMRequestOptions): AsyncGenerator<string, void, unknown>;

  /**
   * Build messages for a simple LLM call
   */
  protected buildSimpleMessages(text: string, history?: string, systemPrompt?: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (history) {
      messages.push({ role: 'user', content: `Previous conversation:\n${history}` });
    }

    messages.push({ role: 'user', content: text });

    return messages;
  }

  /**
   * Build messages for a context-based LLM call
   */
  protected buildContextMessages(
    text: string,
    context: string,
    history?: string,
    customPrompt?: string
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (customPrompt) {
      // Custom prompt - replace placeholders
      const prompt = customPrompt
        .replace('{content}', text)
        .replace('{context}', context);
      
      messages.push({
        role: 'system',
        content: 'You are a helpful assistant that answers questions based on the provided context.'
      });
      messages.push({ role: 'user', content: prompt });
    } else {
      // Default RAG prompt
      const systemPrompt = `You are a helpful assistant. Answer the user's question based on the following context. If the context doesn't contain relevant information, say so and provide what help you can.

CONTEXT:
${context}`;

      messages.push({ role: 'system', content: systemPrompt });

      if (history) {
        messages.push({ role: 'assistant', content: `Previous conversation:\n${history}` });
      }

      messages.push({ role: 'user', content: text });
    }

    return messages;
  }

  /**
   * Get model name to use
   */
  protected getModel(options?: LLMRequestOptions): string {
    return options?.model ?? this.defaultModel;
  }

  /**
   * Get temperature to use
   */
  protected getTemperature(options?: LLMRequestOptions): number {
    return options?.temperature ?? this.defaultTemperature;
  }

  /**
   * Get timeout to use
   */
  protected getTimeout(options?: LLMRequestOptions): number {
    return options?.timeout ?? this.defaultTimeout;
  }

  /**
   * Simple LLM call without context
   */
  async llm(text: string, history?: string, options?: LLMRequestOptions & { customPrompt?: string }): Promise<string> {
    let messages: ChatMessage[];

    if (options?.customPrompt) {
      const prompt = options.customPrompt.replace('{content}', text);
      messages = [{ role: 'user', content: prompt }];
    } else {
      messages = this.buildSimpleMessages(text, history);
    }

    return this.chat(messages, options);
  }

  /**
   * LLM call with context (RAG)
   */
  async llmWithContext(
    text: string,
    context: string,
    history?: string,
    options?: LLMRequestOptions & { customPrompt?: string }
  ): Promise<string> {
    const messages = this.buildContextMessages(text, context, history, options?.customPrompt);
    return this.chat(messages, options);
  }

  /**
   * Stream LLM call with context (RAG)
   */
  async *llmWithContextStream(
    text: string,
    context: string,
    history?: string,
    options?: LLMRequestOptions & { customPrompt?: string }
  ): AsyncGenerator<string, void, unknown> {
    const messages = this.buildContextMessages(text, context, history, options?.customPrompt);
    yield* this.chatStream(messages, options);
  }
}
