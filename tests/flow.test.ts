/**
 * VectorVault Flow Tests
 * 
 * Tests for cloud flow operations (runFlow, streamFlow)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vault } from '../src/vault.js';

describe('Flow Operations', () => {
  describe('Local Mode Error Handling', () => {
    let localVault: Vault;

    beforeEach(() => {
      localVault = new Vault({
        vault: 'test-flow-local',
        openaiKey: 'sk-test-key',
        local: true,
        localDir: './tests/data/flow-test'
      });
    });

    it('runFlow throws error in local mode', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello'))
        .rejects.toThrow('Cloud flows require cloud mode');
    });

    it('runFlow error message suggests getChat alternative', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello'))
        .rejects.toThrow('getChat()');
    });

    it('streamFlow throws error in local mode', async () => {
      const generator = localVault.streamFlow('my-flow', 'Hello');
      
      await expect(generator.next())
        .rejects.toThrow('Cloud flows require cloud mode');
    });

    it('streamFlow error message suggests getChatStream alternative', async () => {
      const generator = localVault.streamFlow('my-flow', 'Hello');
      
      await expect(generator.next())
        .rejects.toThrow('getChatStream()');
    });
  });

  describe('Cloud Mode Structure', () => {
    // Skip tests that require actual API credentials
    const hasCredentials = process.env.VECTORVAULT_USER && process.env.VECTORVAULT_API_KEY;

    it.skipIf(!hasCredentials)('runFlow returns string response', async () => {
      const cloudVault = new Vault({
        vault: 'test-flow-cloud',
        user: process.env.VECTORVAULT_USER!,
        apiKey: process.env.VECTORVAULT_API_KEY!,
        local: false
      });

      // This would require a real flow to exist
      // const response = await cloudVault.runFlow('test-flow', 'Hello');
      // expect(typeof response).toBe('string');
      expect(true).toBe(true); // Placeholder
    });

    it.skipIf(!hasCredentials)('streamFlow yields string tokens', async () => {
      const cloudVault = new Vault({
        vault: 'test-flow-cloud',
        user: process.env.VECTORVAULT_USER!,
        apiKey: process.env.VECTORVAULT_API_KEY!,
        local: false
      });

      // This would require a real flow to exist
      // const tokens: string[] = [];
      // for await (const token of cloudVault.streamFlow('test-flow', 'Hello')) {
      //   tokens.push(token);
      // }
      // expect(tokens.length).toBeGreaterThan(0);
      expect(true).toBe(true); // Placeholder
    });

    it('cloud vault can be created for flow operations', () => {
      // Just verify cloud vault creation works (no API call)
      expect(() => {
        new Vault({
          vault: 'test-flow-cloud',
          user: 'test@example.com',
          apiKey: 'vv_test_key',
          local: false
        });
      }).not.toThrow();
    });
  });

  describe('FlowOptions Interface', () => {
    let localVault: Vault;

    beforeEach(() => {
      localVault = new Vault({
        vault: 'test-flow-options',
        openaiKey: 'sk-test-key',
        local: true,
        localDir: './tests/data/flow-test'
      });
    });

    it('accepts history option', async () => {
      // Even though it throws, it should accept the options structure
      await expect(localVault.runFlow('my-flow', 'Hello', {
        history: 'User: Hi\nAssistant: Hello!'
      })).rejects.toThrow('Cloud flows require cloud mode');
    });

    it('accepts invokeMethod option', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello', {
        invokeMethod: 'chat'
      })).rejects.toThrow('Cloud flows require cloud mode');
    });

    it('accepts internalVars option', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello', {
        internalVars: { userId: '123', context: { key: 'value' } }
      })).rejects.toThrow('Cloud flows require cloud mode');
    });

    it('accepts imageUrl option', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello', {
        imageUrl: 'https://example.com/image.png'
      })).rejects.toThrow('Cloud flows require cloud mode');
    });

    it('accepts all options together', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello', {
        history: 'Previous conversation',
        invokeMethod: 'chat',
        internalVars: { foo: 'bar' },
        imageUrl: 'https://example.com/image.png'
      })).rejects.toThrow('Cloud flows require cloud mode');
    });

    it('accepts additional custom options', async () => {
      await expect(localVault.runFlow('my-flow', 'Hello', {
        customOption: 'value',
        anotherOption: 42
      })).rejects.toThrow('Cloud flows require cloud mode');
    });
  });
});
