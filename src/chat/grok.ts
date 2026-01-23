/**
 * Grok (xAI) Chat Client
 * 
 * Implements LLM chat using xAI's Grok API.
 * xAI uses an OpenAI-compatible API at https://api.x.ai/v1
 * Uses native fetch - no SDK dependency.
 */

import { LLMClient } from './client.js';
import type { ChatMessage, LLMClientOptions, LLMRequestOptions } from './types.js';

interface GrokChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GrokStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

interface GrokErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

export class GrokChatClient extends LLMClient {
  constructor(options: Omit<LLMClientOptions, 'baseUrl' | 'defaultModel'> & { 
    baseUrl?: string; 
    defaultModel?: string;
  }) {
    super({
      ...options,
      baseUrl: options.baseUrl ?? 'https://api.x.ai/v1',
      defaultModel: options.defaultModel ?? 'grok-4-fast-non-reasoning'
    });
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[], options?: LLMRequestOptions): Promise<string> {
    const model = this.getModel(options);
    const temperature = this.getTemperature(options);
    const timeout = this.getTimeout(options);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const body: Record<string, unknown> = {
        model,
        messages
      };

      // Include temperature if specified
      if (temperature !== undefined && temperature !== 0) {
        body.temperature = temperature;
      }

      if (options?.maxTokens) {
        body.max_tokens = options.maxTokens;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GrokErrorResponse;
        const message = errorData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`Grok API error: ${message}`);
      }

      const data = await response.json() as GrokChatResponse;
      return data.choices[0]?.message?.content ?? '';
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        stream: true
      };

      // Include temperature if specified
      if (temperature !== undefined && temperature !== 0) {
        body.temperature = temperature;
      }

      if (options?.maxTokens) {
        body.max_tokens = options.maxTokens;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GrokErrorResponse;
        const message = errorData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`Grok API error: ${message}`);
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
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6)) as GrokStreamChunk;
            const content = json.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.startsWith('data: ')) {
        try {
          const json = JSON.parse(buffer.slice(6)) as GrokStreamChunk;
          const content = json.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Skip invalid JSON
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
