/**
 * VectorVault TypeScript - Local Mode Test Suite
 * 
 * Tests the local filesystem storage backend without cloud dependencies.
 * Modeled after the Python test suite: test_local_mode.py
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Vault } from '../src/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ==================== Test Configuration ====================

const TEST_DIR = path.join(os.tmpdir(), `vectorvault_test_${Date.now()}`);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

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

describe.skipIf(!OPENAI_KEY)('VectorVault Local Mode Tests', () => {
  let vault: Vault;

  beforeAll(() => {
    // Create test directory
    fs.mkdirSync(TEST_DIR, { recursive: true });
    console.log(`\n✓ Created test directory: ${TEST_DIR}`);
  });

  afterAll(() => {
    // Cleanup test directory
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
      console.log(`✓ Cleaned up test directory`);
    } catch {
      // Ignore cleanup errors
    }
  });

  // ==================== Vault Creation Tests ====================

  describe('1. Vault Creation', () => {
    it('test_01_vault_creation: Vault initializes with local=true', () => {
      vault = new Vault({
        vault: 'test_local',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: true
      });

      expect(vault).toBeDefined();
      
      // Check that vault directory was created
      const vaultDir = path.join(TEST_DIR, 'test_local');
      expect(fs.existsSync(vaultDir)).toBe(true);
      console.log(`✓ Local vault created at ${vaultDir}`);
    });

    it('test_02_initial_state: New vault has 0 items', async () => {
      const total = await vault.getTotalItems();
      expect(total).toBe(0);
      console.log(`✓ New local vault has ${total} items (correct)`);
    });

    it('test_03_get_vaults_list: Can list vaults (before items added)', async () => {
      const vaults = await vault.getVaults();
      expect(Array.isArray(vaults)).toBe(true);
      console.log(`✓ get_vaults() returns list (currently: ${JSON.stringify(vaults)})`);
    });
  });

  // ==================== Item Operations Tests ====================

  describe('2. Item Operations', () => {
    it('test_10_add_items: Add multiple items', async () => {
      // Add all items
      for (const text of SAMPLE_TEXTS) {
        vault.add(text, { source: 'machiavelli' });
      }
      
      // Generate embeddings and save
      await vault.getVectors();
      await vault.save();

      const total = await vault.getTotalItems();
      expect(total).toBe(SAMPLE_TEXTS.length);
      console.log(`✓ Added ${total} items`);
    }, 120000); // 2 minute timeout for embeddings

    it('test_11_vault_appears_in_list: Vault shows in getVaults()', async () => {
      const vaults = await vault.getVaults();
      expect(vaults).toContain('test_local');
      console.log(`✓ Vault appears in list: ${JSON.stringify(vaults)}`);
    });

    it('test_12_get_items: Retrieve items by ID', async () => {
      const items = await vault.getItems([0, 1, 2]);
      expect(items.length).toBe(3);

      // Check structure
      for (const item of items) {
        expect(item).toHaveProperty('data');
        expect(item).toHaveProperty('metadata');
      }

      console.log(`✓ Retrieved ${items.length} items`);
      console.log(`  First item preview: ${items[0].data.slice(0, 60)}...`);
    });

    it('test_13_edit_item: Edit item text', async () => {
      const [original] = await vault.getItems([0]);
      const editedText = "EDITED: " + original.data;

      await vault.editItem(0, editedText);

      const [updated] = await vault.getItems([0]);
      expect(updated.data).toStartWith('EDITED:');
      console.log(`✓ Edited item 0: ${original.data.length} → ${updated.data.length} chars`);
    });

    it('test_14_delete_item: Delete items', async () => {
      const beforeCount = await vault.getTotalItems();

      await vault.deleteItems([0]);

      const afterCount = await vault.getTotalItems();
      expect(afterCount).toBe(beforeCount - 1);
      console.log(`✓ Deleted item: ${beforeCount} → ${afterCount}`);
    });

    it('test_15_add_item_back: Add after delete', async () => {
      const beforeCount = await vault.getTotalItems();

      vault.add(SAMPLE_TEXTS[0], { source: 'restored' });
      await vault.getVectors();
      await vault.save();

      const afterCount = await vault.getTotalItems();
      expect(afterCount).toBe(beforeCount + 1);
      console.log(`✓ Added item back: ${beforeCount} → ${afterCount}`);
    });
  });

  // ==================== Vector Operations Tests ====================

  describe('3. Vector Operations', () => {
    it('test_20_get_similar: Semantic search returns correct results', async () => {
      const query = 'well-ordered states and wise princes';
      const results = await vault.getSimilar(query, 3);

      expect(results.length).toBeGreaterThan(0);

      // Check that the most relevant result contains similar content
      const topResult = results[0];
      expect(topResult).toHaveProperty('data');

      console.log(`✓ Found ${results.length} similar items`);
      console.log(`  Query: '${query}'`);
      console.log(`  Top result preview: ${topResult.data.slice(0, 80)}...`);

      // The top result should ideally contain related words
      const topText = topResult.data.toLowerCase();
      const hasRelevantContent = 
        topText.includes('well-ordered') || 
        topText.includes('wise') || 
        topText.includes('princes') ||
        topText.includes('states');
      expect(hasRelevantContent).toBe(true);
    });

    it('test_21_get_similar_with_distance: Returns distances', async () => {
      const query = 'armed prophets conquered';
      const results = await vault.getSimilar(query, 3);

      expect(results.length).toBeGreaterThan(0);
      // Check that distance is returned
      expect(results[0]).toHaveProperty('distance');
      expect(typeof results[0].distance).toBe('number');
      console.log(`✓ Search with distance returned ${results.length} results`);
      console.log(`  Top distance: ${results[0].distance?.toFixed(6)}`);
    });

    it('test_22_get_distance: Calculate distance between items', async () => {
      const distance = await vault.getDistance(1, 2);

      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThanOrEqual(0);
      console.log(`✓ Distance between items 1 and 2: ${distance.toFixed(6)}`);
    });
  });

  // ==================== Persistence Tests ====================

  describe('4. Persistence', () => {
    it('test_30_data_persists: Data survives new Vault instance', async () => {
      // Create a new vault instance pointing to same location
      const vault2 = new Vault({
        vault: 'test_local',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: false
      });

      const total = await vault2.getTotalItems();
      expect(total).toBeGreaterThan(0);
      console.log(`✓ Data persisted: ${total} items in reloaded vault`);
    });

    it('test_31_vectors_persist: Vector search works after reload', async () => {
      const vault2 = new Vault({
        vault: 'test_local',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: false
      });

      const results = await vault2.getSimilar('war and its rules', 3);
      expect(results.length).toBeGreaterThan(0);
      console.log(`✓ Vector search on persisted data: ${results.length} results`);
    });
  });

  // ==================== Prompts Tests ====================

  describe('5. Prompts', () => {
    it('test_40_save_personality: Save/fetch personality message', async () => {
      const message = 'I am a test assistant for VectorVault local mode.';
      await vault.savePersonalityMessage(message);

      const retrieved = await vault.fetchPersonalityMessage();
      expect(retrieved).toBe(message);
      console.log(`✓ Saved personality message: ${message.slice(0, 50)}...`);
    });

    it('test_41_save_custom_prompt_no_context: Save/fetch custom prompts (no context)', async () => {
      const prompt = 'Answer the question directly: {content}';
      await vault.saveCustomPrompt(prompt, false);

      const retrieved = await vault.fetchCustomPrompt(false);
      expect(retrieved).toBe(prompt);
      console.log(`✓ Saved no-context prompt`);
    });

    it('test_42_save_custom_prompt_with_context: Save/fetch custom prompts (with context)', async () => {
      const prompt = `Use this context to answer:
{context}

Question: {content}`;
      await vault.saveCustomPrompt(prompt, true);

      const retrieved = await vault.fetchCustomPrompt(true);
      expect(retrieved).toBe(prompt);
      console.log(`✓ Saved context prompt`);
    });
  });

  // ==================== Multiple Vaults Tests ====================

  describe('6. Multiple Vaults', () => {
    it('test_50_create_second_vault: Multiple vaults work', async () => {
      const vault2 = new Vault({
        vault: 'test_local_2',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: false
      });

      // Add some items
      vault2.add(SAMPLE_TEXTS[0]);
      vault2.add(SAMPLE_TEXTS[1]);
      await vault2.getVectors();
      await vault2.save();

      const total = await vault2.getTotalItems();
      expect(total).toBe(2);
      console.log(`✓ Created second vault with ${total} items`);
    });

    it('test_51_list_multiple_vaults: Both appear in list', async () => {
      const vaults = await vault.getVaults();
      expect(vaults).toContain('test_local');
      expect(vaults).toContain('test_local_2');
      console.log(`✓ Found multiple vaults: ${JSON.stringify(vaults)}`);
    });

    it('test_52_delete_second_vault: Can delete vault', async () => {
      const vault2 = new Vault({
        vault: 'test_local_2',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: false
      });

      await vault2.delete();

      // Check it's gone from the list
      const vaults = await vault.getVaults();
      expect(vaults).not.toContain('test_local_2');
      console.log(`✓ Deleted vault, remaining: ${JSON.stringify(vaults)}`);
    });
  });

  // ==================== Utility Tests ====================

  describe('7. Utilities', () => {
    it('test_60_split_text: Split text into chunks', () => {
      const longText = SAMPLE_TEXTS.join(' ');
      const chunks = vault.splitText(longText, 100, 500);

      expect(chunks.length).toBeGreaterThan(0);
      console.log(`✓ Split text into ${chunks.length} chunks`);
      console.log(`  Original length: ${longText.length}`);
      console.log(`  First chunk: ${chunks[0].slice(0, 50)}...`);
    });

    it('test_61_get_item_vector: Get vector for item', () => {
      const vector = vault.getItemVector(1);
      
      expect(vector).toBeTruthy();
      expect(Array.isArray(vector)).toBe(true);
      expect(vector?.length).toBe(1536); // text-embedding-3-small dimensions
      console.log(`✓ Retrieved vector for item 1: ${vector?.length} dimensions`);
    });
  });

  // ==================== Import/Export Tests ====================

  describe('8. Import/Export', () => {
    it('test_70_download_to_json: Export vault to JSON', async () => {
      const json = await vault.downloadToJson();
      
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(typeof parsed).toBe('object');
      
      // Should have items (we have items from earlier tests)
      const keys = Object.keys(parsed);
      expect(keys.length).toBeGreaterThan(0);
      
      // Each item should have data
      for (const key of keys) {
        expect(parsed[key].data).toBeDefined();
      }
      
      console.log(`✓ Exported ${keys.length} items to JSON`);
    });

    it('test_71_download_to_json_with_meta: Export with metadata', async () => {
      const json = await vault.downloadToJson(true);
      const parsed = JSON.parse(json);
      
      const keys = Object.keys(parsed);
      expect(keys.length).toBeGreaterThan(0);
      
      // Each item should have data AND metadata
      for (const key of keys) {
        expect(parsed[key].data).toBeDefined();
        expect(parsed[key].metadata).toBeDefined();
      }
      
      console.log(`✓ Exported ${keys.length} items with metadata`);
    });

    it('test_72_upload_from_json: Import from JSON', async () => {
      // Create a backup of current data
      const backup = await vault.downloadToJson(true);
      const originalCount = await vault.getTotalItems();
      
      // Create new data to import
      const importData = {
        '0': { data: 'Imported item one' },
        '1': { data: 'Imported item two' },
        '2': { data: 'Imported item three' }
      };
      
      // Import the new data (this replaces existing)
      await vault.uploadFromJson(importData);
      
      const newCount = await vault.getTotalItems();
      expect(newCount).toBe(3);
      
      // Verify the items
      const items = await vault.getItems([0, 1, 2]);
      expect(items[0].data).toBe('Imported item one');
      expect(items[1].data).toBe('Imported item two');
      expect(items[2].data).toBe('Imported item three');
      
      console.log(`✓ Imported ${newCount} items from JSON`);
      
      // Restore original data
      await vault.uploadFromJson(backup);
      const restoredCount = await vault.getTotalItems();
      expect(restoredCount).toBe(originalCount);
      console.log(`✓ Restored ${restoredCount} original items`);
    });
  });

  // ==================== Vault Cloning Tests ====================

  describe('9. Vault Cloning', () => {
    it('test_80_duplicate_vault: Clone vault with all items', async () => {
      const originalCount = await vault.getTotalItems();
      
      // Duplicate the vault
      const clonedVault = await vault.duplicateVault('test_local_clone');
      
      // Verify the cloned vault
      const clonedCount = await clonedVault.getTotalItems();
      expect(clonedCount).toBe(originalCount);
      
      // Verify search works on cloned vault
      const results = await clonedVault.getSimilar('prince', 2);
      expect(results.length).toBeGreaterThan(0);
      
      console.log(`✓ Cloned vault with ${clonedCount} items`);
      
      // Cleanup: delete the cloned vault
      await clonedVault.delete();
      
      const vaults = await vault.getVaults();
      expect(vaults).not.toContain('test_local_clone');
      console.log(`✓ Cleaned up cloned vault`);
    });
  });

  // ==================== Cache Management Tests ====================

  describe('10. Cache Management', () => {
    it('test_90_preload_cache: Preload all items into cache', async () => {
      // This should not throw and should complete successfully
      const startTime = Date.now();
      await vault.preloadCache(5);
      const elapsed = Date.now() - startTime;
      
      // Just verify it completed
      const totalItems = await vault.getTotalItems();
      console.log(`✓ Preloaded ${totalItems} items in ${elapsed}ms`);
      
      expect(totalItems).toBeGreaterThan(0);
    });
  });
});

// Custom matcher extension
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toStartWith(expected: string): T;
    }
  }
}

expect.extend({
  toStartWith(received: string, expected: string) {
    const pass = typeof received === 'string' && received.startsWith(expected);
    if (pass) {
      return {
        message: () => `expected ${received} not to start with ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to start with ${expected}`,
        pass: false,
      };
    }
  },
});
