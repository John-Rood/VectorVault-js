/**
 * VectorVault TypeScript - Cloud Mode Test Suite
 * 
 * Tests the VectorVault Cloud API backend.
 * Requires environment variables:
 * - VECTORVAULT_USER: VectorVault account email
 * - VECTORVAULT_API_KEY: VectorVault API key
 * - OPENAI_API_KEY: (Optional) OpenAI key for local embedding comparison
 * 
 * Modeled after the Python test suite: test_vault_core.py
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Vault, CloudStorageManager } from '../src/index.js';

// ==================== Test Configuration ====================

const VECTORVAULT_USER = process.env.VECTORVAULT_USER;
const VECTORVAULT_API_KEY = process.env.VECTORVAULT_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Check if cloud credentials are available
const hasCloudCredentials = !!(VECTORVAULT_USER && VECTORVAULT_API_KEY);

// Unique vault name to avoid conflicts
const TEST_VAULT = `test_ts_${Date.now()}`;

// Sample texts from The Prince by Machiavelli
const SAMPLE_TEXTS = [
  "All states, all powers, that have held and hold rule over men have been and are either republics or principalities.",
  "Principalities are either hereditary, in which the family has been long established; or they are new.",
  "The new are either entirely new, as was Milan to Francesco Sforza, or they are members annexed to the hereditary state.",
  "Such dominions thus acquired are either accustomed to live under a prince, or to live in freedom.",
  "And well-ordered states and wise princes have taken every care not to drive the nobles to desperation.",
  "A prince ought to have no other aim or thought, nor select anything else for his study, than war and its rules.",
  "Hence it is that all armed prophets have conquered, and the unarmed ones have been destroyed.",
  "Therefore it is unnecessary for a prince to have all the good qualities I have enumerated.",
  "The first opinion which one forms of a prince, and of his understanding, is by observing the men he has around him.",
  "A prince who is not wise himself will never take good advice, unless by chance he has yielded his affairs to a wise man.",
];

// ==================== Test Suite ====================

describe.skipIf(!hasCloudCredentials)('VectorVault Cloud Mode Tests', () => {
  let vault: Vault;

  beforeAll(async () => {
    console.log(`\n✓ Using test vault: ${TEST_VAULT}`);
    
    // Create vault instance
    vault = new Vault({
      vault: TEST_VAULT,
      user: VECTORVAULT_USER!,
      apiKey: VECTORVAULT_API_KEY!,
      local: false,
      verbose: true
    });

    // Create the vault in cloud
    try {
      await vault.createVault();
      console.log(`✓ Created cloud vault: ${TEST_VAULT}`);
    } catch (err) {
      // Vault may already exist
      console.log(`✓ Vault already exists or created`);
    }
  });

  afterAll(async () => {
    // Cleanup: delete test vault
    try {
      await vault.delete();
      console.log(`✓ Deleted test vault: ${TEST_VAULT}`);
    } catch (err) {
      console.log(`⚠ Could not delete vault: ${err}`);
    }
  });

  // ==================== Vault Lifecycle Tests ====================

  describe('1. Vault Lifecycle', () => {
    it('test_01_get_vaults: List vaults returns array', async () => {
      const vaults = await vault.getVaults();
      expect(Array.isArray(vaults)).toBe(true);
      console.log(`✓ Retrieved ${vaults.length} vaults`);
    });

    it('test_02_get_total_items_empty: Newly created vault is empty', async () => {
      const total = await vault.getTotalItems();
      expect(total).toBe(0);
      console.log(`✓ New vault has ${total} items`);
    });
  });

  // ==================== Item Operations Tests ====================

  describe('2. Item Operations', () => {
    it('test_10_add_items: Add items to vault', async () => {
      // Add all sample texts
      for (const text of SAMPLE_TEXTS) {
        vault.add(text, { source: 'machiavelli' });
      }
      
      // Upload to cloud
      await vault.getVectors();
      await vault.save();

      // Wait a moment for cloud processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const total = await vault.getTotalItems();
      expect(total).toBeGreaterThan(0);
      console.log(`✓ Added items, total: ${total}`);
    }, 60000);

    it('test_11_get_total_items: Vault has items after add', async () => {
      const total = await vault.getTotalItems();
      expect(total).toBeGreaterThan(0);
      console.log(`✓ Vault has ${total} items`);
    });

    it('test_12_get_items: Retrieve items by ID', async () => {
      const total = await vault.getTotalItems();
      if (total === 0) {
        console.log('⚠ Skipping - no items in vault');
        return;
      }

      const items = await vault.getItems([0, 1, 2]);
      expect(items.length).toBeGreaterThan(0);
      
      // Check structure
      for (const item of items) {
        expect(item).toHaveProperty('data');
        expect(item).toHaveProperty('metadata');
      }

      console.log(`✓ Retrieved ${items.length} items`);
      console.log(`  First item preview: ${items[0].data.slice(0, 50)}...`);
    });

    it('test_13_edit_item: Edit item text', async () => {
      const total = await vault.getTotalItems();
      if (total === 0) {
        console.log('⚠ Skipping - no items in vault');
        return;
      }

      const [original] = await vault.getItems([0]);
      const newText = original.data.slice(0, -20); // Remove last 20 chars

      await vault.editItem(0, newText);

      // Wait for cloud processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [edited] = await vault.getItems([0]);
      expect(edited.data.length).toBeLessThan(original.data.length);
      console.log(`✓ Edited item 0: ${original.data.length} → ${edited.data.length} chars`);
    });

    it('test_14_delete_item: Delete item', async () => {
      const beforeCount = await vault.getTotalItems();
      if (beforeCount === 0) {
        console.log('⚠ Skipping - no items in vault');
        return;
      }

      await vault.deleteItems([0]);

      // Wait for cloud processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const afterCount = await vault.getTotalItems();
      expect(afterCount).toBe(beforeCount - 1);
      console.log(`✓ Deleted item: ${beforeCount} → ${afterCount}`);
    });

    it('test_15_add_item_back: Add item after delete', async () => {
      const beforeCount = await vault.getTotalItems();

      vault.add(SAMPLE_TEXTS[0], { source: 'restored' });
      await vault.getVectors();
      await vault.save();

      // Wait for cloud processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const afterCount = await vault.getTotalItems();
      expect(afterCount).toBe(beforeCount + 1);
      console.log(`✓ Added item back: ${beforeCount} → ${afterCount}`);
    }, 30000);
  });

  // ==================== Vector Operations Tests ====================

  describe('3. Vector Operations', () => {
    it('test_20_get_similar: Vector similarity search', async () => {
      const total = await vault.getTotalItems();
      if (total === 0) {
        console.log('⚠ Skipping - no items in vault');
        return;
      }

      const searchQuery = 'well-ordered states and wise princes';
      const results = await vault.getSimilar(searchQuery, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('data');
      expect(results[0]).toHaveProperty('metadata');

      console.log(`✓ Found ${results.length} similar items`);
      console.log(`  Query: '${searchQuery}'`);
      console.log(`  Top result: ${results[0].data.slice(0, 80)}...`);
    });

    it('test_21_get_distance: Distance between items', async () => {
      const total = await vault.getTotalItems();
      if (total < 2) {
        console.log('⚠ Skipping - need at least 2 items');
        return;
      }

      const distance = await vault.getDistance(1, 2);

      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThanOrEqual(0);
      console.log(`✓ Distance between items 1 and 2: ${distance.toFixed(6)}`);
    });
  });

  // ==================== Prompt Configuration Tests ====================

  describe('4. Prompt Configuration', () => {
    const testPersonality = 'I am a helpful AI assistant for testing VectorVault TypeScript.';
    const testPromptNoContext = 'Answer this question: {content}';
    const testPromptWithContext = `Use this context:
{context}

Question: {content}`;

    it('test_30_save_personality_message: Save personality', async () => {
      await vault.savePersonalityMessage(testPersonality);
      console.log(`✓ Saved personality message`);
    });

    it('test_31_fetch_personality_message: Fetch personality', async () => {
      const fetched = await vault.fetchPersonalityMessage();
      expect(fetched).toBe(testPersonality);
      console.log(`✓ Fetched personality message`);
    });

    it('test_32_save_custom_prompt_no_context: Save prompt without context', async () => {
      await vault.saveCustomPrompt(testPromptNoContext, false);
      console.log(`✓ Saved no-context prompt`);
    });

    it('test_33_fetch_custom_prompt_no_context: Fetch prompt without context', async () => {
      const fetched = await vault.fetchCustomPrompt(false);
      expect(fetched).toBe(testPromptNoContext);
      console.log(`✓ Fetched no-context prompt`);
    });

    it('test_34_save_custom_prompt_with_context: Save prompt with context', async () => {
      await vault.saveCustomPrompt(testPromptWithContext, true);
      console.log(`✓ Saved context prompt`);
    });

    it('test_35_fetch_custom_prompt_with_context: Fetch prompt with context', async () => {
      const fetched = await vault.fetchCustomPrompt(true);
      expect(fetched).toBe(testPromptWithContext);
      console.log(`✓ Fetched context prompt`);
    });
  });

  // ==================== Chat Tests ====================

  describe('5. Chat Operations', () => {
    it('test_40_get_chat_no_context: Chat without RAG', async () => {
      const response = await vault.getChat("Say 'hello' and nothing else.", {
        getContext: false
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      console.log(`✓ Chat without context: '${response.slice(0, 50)}...'`);
    }, 30000);

    it('test_41_get_chat_with_context: RAG chat', async () => {
      const total = await vault.getTotalItems();
      if (total === 0) {
        console.log('⚠ Skipping - no items for context');
        return;
      }

      const response = await vault.getChat('What does the text say about wise princes?', {
        getContext: true,
        nContext: 3
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      console.log(`✓ RAG chat response: '${response.slice(0, 100)}...'`);
    }, 30000);
  });
});

// ==================== CloudStorageManager Direct Tests ====================

describe.skipIf(!hasCloudCredentials)('CloudStorageManager Direct Tests', () => {
  let storage: CloudStorageManager;
  const testVaultName = `test_csm_${Date.now()}`;

  beforeAll(() => {
    storage = new CloudStorageManager(
      VECTORVAULT_USER!,
      VECTORVAULT_API_KEY!,
      testVaultName
    );
  });

  afterAll(async () => {
    try {
      await storage.deleteVault();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should authenticate successfully', async () => {
    // This will trigger authentication
    const vaults = await storage.listVaults();
    expect(Array.isArray(vaults)).toBe(true);
    expect(storage.isAuthenticated()).toBe(true);
  });

  it('should create and delete vault', async () => {
    await storage.createVault();
    
    const vaults = await storage.listVaults();
    expect(vaults).toContain(testVaultName);

    await storage.deleteVault();
    
    const vaultsAfter = await storage.listVaults();
    expect(vaultsAfter).not.toContain(testVaultName);
  });

  it('should get total items', async () => {
    await storage.createVault();
    const total = await storage.getTotalItems();
    expect(total).toBe(0);
  });
});

// ==================== Skip Message ====================

describe.skipIf(hasCloudCredentials)('Cloud Tests Skipped', () => {
  it('should display skip message', () => {
    console.log('\n⚠ Cloud tests skipped - missing credentials');
    console.log('  Set VECTORVAULT_USER and VECTORVAULT_API_KEY to run cloud tests');
    expect(true).toBe(true);
  });
});
