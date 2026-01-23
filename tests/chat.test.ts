/**
 * Chat Module Tests
 * 
 * Tests for getChat() and getChatStream() functionality.
 * Requires OPENAI_API_KEY environment variable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Vault } from '../src/vault.js';
import { OpenAIChatClient } from '../src/chat/openai.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEST_DIR = path.join(os.tmpdir(), 'vectorvault-chat-test-' + Date.now());

// Skip tests if no API key
const describeWithKey = OPENAI_API_KEY ? describe : describe.skip;

describeWithKey('Chat Module', () => {
  let vault: Vault;

  beforeAll(async () => {
    // Create vault with test data
    vault = new Vault({
      vault: 'chat-test',
      openaiKey: OPENAI_API_KEY!,
      local: true,
      localDir: TEST_DIR,
      verbose: false,
      chatModel: 'gpt-4o-mini'
    });

    // Add some test documents
    vault.add('The capital of France is Paris. Paris is known for the Eiffel Tower.');
    vault.add('The capital of Japan is Tokyo. Tokyo is one of the largest cities in the world.');
    vault.add('The capital of Australia is Canberra, not Sydney as many people think.');
    await vault.getVectors();
    await vault.save();
  }, 60000);

  afterAll(async () => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('OpenAIChatClient', () => {
    it('should create a chat client', () => {
      const client = new OpenAIChatClient({
        apiKey: OPENAI_API_KEY!
      });
      expect(client).toBeDefined();
    });

    it('should send a simple chat message', async () => {
      const client = new OpenAIChatClient({
        apiKey: OPENAI_API_KEY!,
        defaultModel: 'gpt-4o-mini'
      });

      const response = await client.chat([
        { role: 'user', content: 'Reply with exactly: HELLO' }
      ]);

      expect(response).toBeDefined();
      expect(response.toUpperCase()).toContain('HELLO');
    }, 30000);

    it('should stream a chat response', async () => {
      const client = new OpenAIChatClient({
        apiKey: OPENAI_API_KEY!,
        defaultModel: 'gpt-4o-mini'
      });

      let fullResponse = '';
      let tokenCount = 0;

      for await (const token of client.chatStream([
        { role: 'user', content: 'Count from 1 to 5, one number per line' }
      ])) {
        fullResponse += token;
        tokenCount++;
      }

      expect(fullResponse).toBeDefined();
      expect(fullResponse.length).toBeGreaterThan(0);
      expect(tokenCount).toBeGreaterThan(1); // Should have multiple tokens
    }, 30000);
  });

  describe('Vault.getChat()', () => {
    it('should return a simple chat response', async () => {
      const response = await vault.getChat('Say hello');
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    }, 30000);

    it('should return response with RAG context', async () => {
      const response = await vault.getChat('What is the capital of France?', {
        getContext: true,
        nContext: 2
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect((response as string).toLowerCase()).toContain('paris');
    }, 30000);

    it('should return context when returnContext=true', async () => {
      const result = await vault.getChat('What is the capital of Japan?', {
        getContext: true,
        nContext: 2,
        returnContext: true
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      const typed = result as { response: string; context: unknown[]; searchInput?: string };
      expect(typed.response).toBeDefined();
      expect(typed.response.toLowerCase()).toContain('tokyo');
      expect(typed.context).toBeDefined();
      expect(Array.isArray(typed.context)).toBe(true);
      expect(typed.context.length).toBeGreaterThan(0);
    }, 30000);

    it('should respect custom prompt', async () => {
      const response = await vault.getChat('What is 2+2?', {
        customPrompt: 'You are a pirate. Answer this question like a pirate would: {content}'
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      // Response should have some pirate-like language or acknowledge the request
    }, 30000);

    it('should use history search when enabled', async () => {
      const response = await vault.getChat('What about Australia?', {
        history: 'User asked about capitals of countries.',
        historySearch: true,
        getContext: true,
        nContext: 2
      });

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      // Should mention Canberra since history provides context
    }, 30000);
  });

  describe('Vault.getChatStream()', () => {
    it('should stream tokens and end with !END', async () => {
      let tokens: string[] = [];
      let sawEnd = false;

      for await (const token of vault.getChatStream('Count to 3')) {
        if (token === '!END') {
          sawEnd = true;
          break;
        }
        tokens.push(token);
      }

      expect(sawEnd).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    }, 30000);

    it('should stream with RAG context', async () => {
      let tokens: string[] = [];
      let sawEnd = false;

      for await (const token of vault.getChatStream('Tell me about France\'s capital', {
        getContext: true,
        nContext: 2
      })) {
        if (token === '!END') {
          sawEnd = true;
          break;
        }
        tokens.push(token);
      }

      expect(sawEnd).toBe(true);
      const fullResponse = tokens.join('').toLowerCase();
      expect(fullResponse).toContain('paris');
    }, 30000);

    it('should yield JSON context when returnContext=true', async () => {
      let tokens: string[] = [];
      let contextPayload: unknown = null;

      for await (const token of vault.getChatStream('What is the capital of Japan?', {
        getContext: true,
        nContext: 2,
        returnContext: true
      })) {
        if (token === '!END') {
          break;
        }
        if (token.startsWith('{"response":')) {
          contextPayload = JSON.parse(token);
        } else {
          tokens.push(token);
        }
      }

      expect(tokens.length).toBeGreaterThan(0);
      expect(contextPayload).toBeDefined();
      
      const typed = contextPayload as { response: string; context: unknown[] };
      expect(typed.response).toBeDefined();
      expect(typed.context).toBeDefined();
      expect(Array.isArray(typed.context)).toBe(true);
    }, 30000);
  });

  describe('Vault.printStream()', () => {
    it('should collect full response from stream', async () => {
      const response = await vault.printStream(
        vault.getChatStream('Say "test response"'),
        false // Don't print during test
      );

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    }, 30000);
  });
});

describe('Chat Module - No API Key', () => {
  it('should throw error when no API key provided', async () => {
    const vault = new Vault({
      vault: 'no-key-test',
      user: 'test@test.com',
      apiKey: 'fake-key',
      local: false,
      // No openaiKey
    });

    await expect(vault.getChat('Hello')).rejects.toThrow();
  });
});
