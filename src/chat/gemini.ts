/**
 * Gemini Chat Client
 * 
 * Implements LLM chat using Google's Gemini API.
 * Uses native fetch - no SDK dependency.
 * 
 * Note: Gemini handles system prompts differently - they are passed
 * as a system_instruction in the generation config.
 */

import { LLMClient } from './client.js';
import type { ChatMessage, LLMClientOptions, LLMRequestOptions } from './types.js';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>;
      role?: string;
    };
    finishReason?: string;
  }>;
}

interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiChatClient extends LLMClient {
  constructor(options: Omit<LLMClientOptions, 'baseUrl' | 'defaultModel'> & { 
    baseUrl?: string; 
    defaultModel?: string;
  }) {
    super({
      ...options,
      baseUrl: options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta',
      defaultModel: options.defaultModel ?? 'gemini-2.0-flash'
    });
  }

  /**
   * Convert standard ChatMessage format to Gemini format
   * Gemini uses 'model' instead of 'assistant' and handles system prompts separately
   */
  private convertMessages(messages: ChatMessage[]): { 
    systemInstruction?: string; 
    contents: GeminiContent[];
  } {
    let systemInstruction: string | undefined;
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Combine system messages into system instruction
        systemInstruction = systemInstruction 
          ? `${systemInstruction}\n\n${msg.content}` 
          : msg.content;
      } else {
        // Map 'assistant' to 'model' for Gemini
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: msg.content }]
        });
      }
    }

    // Gemini requires alternating user/model messages
    // Merge consecutive same-role messages
    const merged: GeminiContent[] = [];
    for (const content of contents) {
      const last = merged[merged.length - 1];
      if (last && last.role === content.role) {
        // Merge text parts
        last.parts[0].text += '\n\n' + content.parts[0].text;
      } else {
        merged.push({ ...content, parts: [...content.parts] });
      }
    }

    // Ensure conversation starts with user message
    if (merged.length > 0 && merged[0].role !== 'user') {
      merged.unshift({ role: 'user', parts: [{ text: '(continued)' }] });
    }

    return { systemInstruction, contents: merged };
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[], options?: LLMRequestOptions): Promise<string> {
    const model = this.getModel(options);
    const temperature = this.getTemperature(options);
    const timeout = this.getTimeout(options);

    const { systemInstruction, contents } = this.convertMessages(messages);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Build request body
      const body: Record<string, unknown> = {
        contents
      };

      // Add generation config
      const generationConfig: Record<string, unknown> = {};
      
      if (temperature !== undefined && temperature !== 0) {
        generationConfig.temperature = temperature;
      }
      
      if (options?.maxTokens) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      if (Object.keys(generationConfig).length > 0) {
        body.generationConfig = generationConfig;
      }

      // Add system instruction if present
      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GeminiErrorResponse;
        const message = errorData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`Gemini API error: ${message}`);
      }

      const data = await response.json() as GeminiResponse;
      
      // Extract text from response
      const textContent = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        ?.join('') ?? '';

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

    const { systemInstruction, contents } = this.convertMessages(messages);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Build request body
      const body: Record<string, unknown> = {
        contents
      };

      // Add generation config
      const generationConfig: Record<string, unknown> = {};
      
      if (temperature !== undefined && temperature !== 0) {
        generationConfig.temperature = temperature;
      }
      
      if (options?.maxTokens) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }

      if (Object.keys(generationConfig).length > 0) {
        body.generationConfig = generationConfig;
      }

      // Add system instruction if present
      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const response = await fetch(
        `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as GeminiErrorResponse;
        const message = errorData.error?.message ?? `HTTP ${response.status}`;
        throw new Error(`Gemini API error: ${message}`);
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
            const json = JSON.parse(trimmed.slice(6)) as GeminiStreamChunk;
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const json = JSON.parse(buffer.slice(6)) as GeminiStreamChunk;
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
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
