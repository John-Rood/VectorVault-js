/**
 * Anthropic Chat Client Tests
 * 
 * Tests the AnthropicChatClient provider.
 * Skips API tests if ANTHROPIC_API_KEY is not set.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicChatClient } from '../src/chat/anthropic.js';
import type { ChatMessage } from '../src/chat/types.js';

describe('AnthropicChatClient', () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const hasApiKey = !!apiKey;

  describe('Constructor', () => {
    it('should create client with default model', () => {
      if (hasApiKey) {
        const client = new AnthropicChatClient({ apiKey });
        expect(client).toBeDefined();
      } else {
        // Skip if no API key but don't fail
        expect(true).toBe(true);
      }
    });

    it('should accept custom model', () => {
      if (hasApiKey) {
        const client = new AnthropicChatClient({
          apiKey,
          defaultModel: 'claude-3-5-haiku-latest'
        });
        expect(client).toBeDefined();
      } else {
        expect(true).toBe(true);
      }
    });
  });

  // API tests - skipped if no key
  const describeIfKey = hasApiKey ? describe : describe.skip;

  describeIfKey('API Integration (requires ANTHROPIC_API_KEY)', () => {
    let client: AnthropicChatClient;

    beforeAll(() => {
      client = new AnthropicChatClient({
        apiKey: apiKey!,
        defaultModel: 'claude-3-5-haiku-latest' // Use haiku for fast/cheap tests
      });
    });

    it('should complete a simple chat request', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Say "hello" and nothing else.' }
      ];
      
      const response = await client.chat(messages);
      expect(response.toLowerCase()).toContain('hello');
    }, 30000);

    it('should handle system messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a pirate. Respond only with "Arrr!"' },
        { role: 'user', content: 'Greet me.' }
      ];
      
      const response = await client.chat(messages);
      expect(response.toLowerCase()).toMatch(/arr/i);
    }, 30000);

    it('should handle conversation history', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'My name is TestUser.' },
        { role: 'assistant', content: 'Nice to meet you, TestUser!' },
        { role: 'user', content: 'What is my name?' }
      ];
      
      const response = await client.chat(messages);
      expect(response.toLowerCase()).toContain('testuser');
    }, 30000);

    it('should stream chat responses', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Count from 1 to 5, one number per line.' }
      ];
      
      let fullResponse = '';
      let chunkCount = 0;
      
      for await (const chunk of client.chatStream(messages)) {
        fullResponse += chunk;
        chunkCount++;
      }
      
      expect(chunkCount).toBeGreaterThan(1);
      expect(fullResponse).toMatch(/1/);
      expect(fullResponse).toMatch(/5/);
    }, 30000);

    it('should use llm helper method', async () => {
      const response = await client.llm('What is 2 + 2? Reply with just the number.');
      expect(response).toContain('4');
    }, 30000);

    it('should use llmWithContext for RAG-style queries', async () => {
      const context = 'The capital of France is Paris. The Eiffel Tower is located in Paris.';
      const response = await client.llmWithContext(
        'Where is the Eiffel Tower?',
        context
      );
      expect(response.toLowerCase()).toContain('paris');
    }, 30000);

    it('should stream llmWithContext responses', async () => {
      const context = 'VectorVault is a local-first vector database for AI applications.';
      
      let fullResponse = '';
      for await (const chunk of client.llmWithContextStream(
        'What is VectorVault?',
        context
      )) {
        fullResponse += chunk;
      }
      
      expect(fullResponse.toLowerCase()).toMatch(/vector|database|ai/i);
    }, 30000);

    it('should respect temperature parameter', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'What is 1+1?' }
      ];
      
      // Low temperature should give deterministic response
      const response = await client.chat(messages, { temperature: 0.1 });
      expect(response).toContain('2');
    }, 30000);

    it('should handle custom prompts', async () => {
      const response = await client.llm('cats', undefined, {
        customPrompt: 'Respond with only the word "{content}" in all caps.'
      });
      expect(response.toUpperCase()).toContain('CATS');
    }, 30000);
  });
});
