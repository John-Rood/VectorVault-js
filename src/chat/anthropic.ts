/**
 * Anthropic Chat Client
 * 
 * Implements LLM chat using Anthropic's Messages API.
 * Uses native fetch - no SDK dependency.
 */

import { LLMClient } from './client.js';
import type { ChatMessage, LLMClientOptions, LLMRequestOptions } from './types.js';

interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
  };
  message?: AnthropicMessageResponse;
}

interface AnthropicErrorResponse {
  error: {
    type: string;
    message: string;
  };
}

export class AnthropicChatClient extends LLMClient {
  private anthropicVersion: string;

  constructor(options: Omit<LLMClientOptions, 'baseUrl' | 'defaultModel'> & { 
    baseUrl?: string; 
    defaultModel?: string;
  }) {
    super({
      ...options,
      baseUrl: options.baseUrl ?? 'https://api.anthropic.com/v1',
      defaultModel: options.defaultModel ?? 'claude-sonnet-4-20250514'
    });
    this.anthropicVersion = '2023-06-01';
  }

  /**
   * Convert standard ChatMessage format to Anthropic format
   * Anthropic uses a different structure with system as a separate param
   */
  private convertMessages(messages: ChatMessage[]): { 
    system?: string; 
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let systemPrompt: string | undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Combine system messages
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${msg.content}` : msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Anthropic requires alternating user/assistant messages
    // Merge consecutive same-role messages
    const merged: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of anthropicMessages) {
      const last = merged[merged.length - 1];
      if (last && last.role === msg.role) {
        last.content += '\n\n' + msg.content;
      } else {
        merged.push({ ...msg });
      }
    }

    // Ensure conversation starts with user message
    if (merged.length > 0 && merged[0].role !== 'user') {
      merged.unshift({ role: 'user', content: '(continued)' });
    }

    return { system: systemPrompt, messages: merged };
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[], options?: LLMRequestOptions): Promise<string> {
    const model = this.getModel(options);
    const temperature = this.getTemperature(options);
    const timeout = this.getTimeout(options);

    const { system, messages: anthropicMessages } = this.convertMessages(messages);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const body: Record<string, unknown> = {
        model,
        messages: anthropicMessages,
        max_tokens: options?.maxTokens ?? 8192
      };

      // Only include temperature if non-zero (Anthropic default is 1.0)
      if (temperature !== undefined && temperature !== 0) {
        body.temperature = temperature;
      }

      if (system) {
        body.system = system;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.anthropicVersion,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as AnthropicErrorResponse;
        const message = errorData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`Anthropic API error: ${message}`);
      }

      const data = await response.json() as AnthropicMessageResponse;
      
      // Extract text from content blocks
      const textContent = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return textContent;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Stream a chat completion
   * Yields tokens as they arrive
   */
  async *chatStream(messages: ChatMessage[], options?: LLMRequestOptions): AsyncGenerator<string, void, unknown> {
    const model = this.getModel(options);
    const temperature = this.getTemperature(options);
    const timeout = this.getTimeout(options);

    const { system, messages: anthropicMessages } = this.convertMessages(messages);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const body: Record<string, unknown> = {
        model,
        messages: anthropicMessages,
        max_tokens: options?.maxTokens ?? 8192,
        stream: true
      };

      if (temperature !== undefined && temperature !== 0) {
        body.temperature = temperature;
      }

      if (system) {
        body.system = system;
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.anthropicVersion,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as AnthropicErrorResponse;
        const message = errorData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`Anthropic API error: ${message}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // Skip empty or comment lines
          
          if (trimmed.startsWith('event:')) continue; // Event type line
          
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr) as AnthropicStreamEvent;
            
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim() && buffer.startsWith('data:')) {
        const dataStr = buffer.slice(5).trim();
        if (dataStr) {
          try {
            const event = JSON.parse(dataStr) as AnthropicStreamEvent;
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
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
