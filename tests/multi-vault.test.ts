/**
 * VectorVault TypeScript - Multi-Vault Search Test Suite
 * 
 * Tests the getSimilarFromVaults() cross-vault search functionality.
 * Tests all three vault selector modes: string, string[], and Record<string, number>
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Vault } from '../src/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ==================== Test Configuration ====================

const TEST_DIR = path.join(os.tmpdir(), `vectorvault_multivault_test_${Date.now()}`);
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Sample texts for different vaults - thematically distinct for easier testing
const VAULT1_TEXTS = [
  "The mitochondria is the powerhouse of the cell, producing ATP through oxidative phosphorylation.",
  "Photosynthesis converts light energy into chemical energy stored in glucose molecules.",
  "DNA replication is a semiconservative process that occurs during the S phase of the cell cycle.",
  "Enzymes are biological catalysts that lower the activation energy of chemical reactions.",
];

const VAULT2_TEXTS = [
  "Neural networks are computational models inspired by biological brain structure.",
  "Machine learning algorithms improve their performance through experience and data.",
  "Deep learning uses multiple layers of neural networks to learn hierarchical representations.",
  "Gradient descent is an optimization algorithm used to minimize the loss function.",
];

const VAULT3_TEXTS = [
  "The Renaissance was a period of cultural rebirth that began in Italy in the 14th century.",
  "The Industrial Revolution transformed manufacturing through mechanization and steam power.",
  "World War II was a global conflict that lasted from 1939 to 1945.",
  "The Cold War was a period of geopolitical tension between the United States and Soviet Union.",
];

// ==================== Test Suite ====================

describe.skipIf(!OPENAI_KEY)('VectorVault Multi-Vault Search Tests', () => {
  let vault1: Vault;
  let vault2: Vault;
  let vault3: Vault;
  let mainVault: Vault;

  beforeAll(async () => {
    // Create test directory
    fs.mkdirSync(TEST_DIR, { recursive: true });
    console.log(`\n✓ Created test directory: ${TEST_DIR}`);

    // Create and populate three vaults with distinct content
    console.log('Setting up test vaults...');

    // Vault 1: Biology
    vault1 = new Vault({
      vault: 'biology_vault',
      openaiKey: OPENAI_KEY!,
      local: true,
      localDir: TEST_DIR,
      verbose: false
    });

    for (const text of VAULT1_TEXTS) {
      vault1.add(text);
    }
    await vault1.getVectors();
    await vault1.save();
    console.log('✓ Created biology_vault with 4 items');

    // Vault 2: AI/ML
    vault2 = new Vault({
      vault: 'aiml_vault',
      openaiKey: OPENAI_KEY!,
      local: true,
      localDir: TEST_DIR,
      verbose: false
    });

    for (const text of VAULT2_TEXTS) {
      vault2.add(text);
    }
    await vault2.getVectors();
    await vault2.save();
    console.log('✓ Created aiml_vault with 4 items');

    // Vault 3: History
    vault3 = new Vault({
      vault: 'history_vault',
      openaiKey: OPENAI_KEY!,
      local: true,
      localDir: TEST_DIR,
      verbose: false
    });

    for (const text of VAULT3_TEXTS) {
      vault3.add(text);
    }
    await vault3.getVectors();
    await vault3.save();
    console.log('✓ Created history_vault with 4 items');

    // Main vault (the one we'll call getSimilarFromVaults from)
    mainVault = new Vault({
      vault: 'main_vault',
      openaiKey: OPENAI_KEY!,
      local: true,
      localDir: TEST_DIR,
      verbose: false
    });
  }, 120000); // 2 minute timeout for setup

  afterAll(() => {
    // Cleanup test directory
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
      console.log(`✓ Cleaned up test directory`);
    } catch {
      // Ignore cleanup errors
    }
  });

  // ==================== Validation Tests ====================

  describe('1. Validation', () => {
    it('test_01_throws_without_vaults: Should throw error when vaults is not provided', async () => {
      await expect(mainVault.getSimilarFromVaults('test query', 4, undefined))
        .rejects.toThrow('vaults must be provided');
      console.log('✓ Correctly throws when vaults is undefined');
    });
  });

  // ==================== Single Vault (String) Tests ====================

  describe('2. Single Vault Search (string)', () => {
    it('test_02_single_vault_search: Should search a single vault by name', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'How do cells produce energy?',
        4,
        'biology_vault'
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(4);
      
      // Should find biology-related content
      const hasRelevantContent = results.some(r => 
        r.data.toLowerCase().includes('mitochondria') || 
        r.data.toLowerCase().includes('atp') ||
        r.data.toLowerCase().includes('cell')
      );
      expect(hasRelevantContent).toBe(true);
      
      console.log(`✓ Single vault search returned ${results.length} results from biology_vault`);
    });

    it('test_03_single_vault_includes_distances: Results should include distances', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'neural networks',
        2,
        'aiml_vault'
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].distance).toBeDefined();
      expect(typeof results[0].distance).toBe('number');
      
      console.log(`✓ Results include distances (first: ${results[0].distance?.toFixed(4)})`);
    });

    it('test_04_nonexistent_vault: Should return empty array for non-existent vault', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'test query',
        4,
        'nonexistent_vault'
      );

      expect(results).toEqual([]);
      console.log('✓ Non-existent vault returns empty array');
    });
  });

  // ==================== Multiple Vaults (Array) Tests ====================

  describe('3. Multiple Vault Search (string[])', () => {
    it('test_05_merge_multiple_vaults: Should merge results from multiple vaults', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'learning and intelligence',
        6,
        ['biology_vault', 'aiml_vault']
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(6);
      
      console.log(`✓ Multi-vault search returned ${results.length} merged results`);
    });

    it('test_06_global_sort_by_distance: Results should be globally sorted by distance', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'machine learning algorithms',
        4,
        ['biology_vault', 'aiml_vault', 'history_vault']
      );

      // Check that results are sorted by distance (ascending)
      for (let i = 1; i < results.length; i++) {
        const prevDist = results[i - 1].distance ?? Infinity;
        const currDist = results[i].distance ?? Infinity;
        expect(prevDist).toBeLessThanOrEqual(currDist);
      }
      
      console.log('✓ Results are globally sorted by distance');
    });

    it('test_07_returns_top_n: Should return exactly top-n results when enough available', async () => {
      const n = 3;
      const results = await mainVault.getSimilarFromVaults(
        'historical events',
        n,
        ['biology_vault', 'aiml_vault', 'history_vault']
      );

      expect(results.length).toBe(n);
      console.log(`✓ Returned exactly ${n} results as requested`);
    });

    it('test_08_handles_partial_failures: Should handle some vaults not existing', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'test query',
        4,
        ['biology_vault', 'fake_vault', 'aiml_vault']
      );

      expect(results.length).toBeGreaterThan(0);
      console.log(`✓ Handled partial failures, returned ${results.length} results`);
    });
  });

  // ==================== Minimum Per Vault (Record) Tests ====================

  describe('4. Minimum Per Vault Search (Record<string, number>)', () => {
    it('test_09_enforce_minimums: Should enforce minimum results per vault', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'learning about cells',
        6,
        { biology_vault: 2, aiml_vault: 1 }
      );

      expect(results.length).toBeGreaterThanOrEqual(3); // At least 2 + 1
      
      // Count results that likely came from each vault
      const biologyResults = results.filter(r => 
        r.data.toLowerCase().includes('cell') || 
        r.data.toLowerCase().includes('dna') ||
        r.data.toLowerCase().includes('enzyme') ||
        r.data.toLowerCase().includes('photosynthesis')
      );
      const aimlResults = results.filter(r => 
        r.data.toLowerCase().includes('neural') || 
        r.data.toLowerCase().includes('machine') ||
        r.data.toLowerCase().includes('learning') ||
        r.data.toLowerCase().includes('gradient')
      );

      expect(biologyResults.length).toBeGreaterThanOrEqual(2);
      expect(aimlResults.length).toBeGreaterThanOrEqual(1);
      
      console.log(`✓ Enforced minimums: ${biologyResults.length} biology, ${aimlResults.length} AI/ML`);
    });

    it('test_10_fill_remaining_globally: Should fill remaining slots with best overall', async () => {
      // Request 6 total, with min 1 from each of 2 vaults = 2 minimum
      // Should fill remaining 4 with best overall matches
      const results = await mainVault.getSimilarFromVaults(
        'machine learning',
        6,
        { aiml_vault: 1, history_vault: 1 }
      );

      expect(results.length).toBe(6);
      
      console.log(`✓ Filled ${results.length} total slots with minimums and global best`);
    });

    it('test_11_adjust_n_when_minimums_exceed: Should adjust n when total minimums exceed n', async () => {
      // Request n=3, but minimums total 4 (2+2)
      // Should return at least 4
      const results = await mainVault.getSimilarFromVaults(
        'test query',
        3,
        { biology_vault: 2, aiml_vault: 2 }
      );

      expect(results.length).toBeGreaterThanOrEqual(4);
      
      console.log(`✓ Adjusted to return ${results.length} results (minimums exceeded n)`);
    });

    it('test_12_handle_insufficient_results: Should handle vault with fewer items than minimum', async () => {
      // Request more than available
      const results = await mainVault.getSimilarFromVaults(
        'test query',
        10,
        { biology_vault: 10 } // Only 4 items in vault
      );

      // Should return what's available (4)
      expect(results.length).toBe(4);
      
      console.log(`✓ Handled insufficient results: returned ${results.length} (max available)`);
    });
  });

  // ==================== Edge Cases ====================

  describe('5. Edge Cases', () => {
    it('test_13_search_own_vault: Can search the same vault', async () => {
      // Add some items to mainVault first
      mainVault.add('This is a test document in the main vault about testing.');
      await mainVault.getVectors();
      await mainVault.save();

      const results = await mainVault.getSimilarFromVaults(
        'testing',
        4,
        'main_vault'
      );

      expect(results.length).toBeGreaterThan(0);
      console.log(`✓ Can search own vault, found ${results.length} results`);
    });

    it('test_14_empty_array_returns_empty: Empty vault array returns empty results', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'test query',
        4,
        []
      );

      expect(results).toEqual([]);
      console.log('✓ Empty vault array returns empty results');
    });

    it('test_15_empty_record_returns_empty: Empty vault record returns empty results', async () => {
      const results = await mainVault.getSimilarFromVaults(
        'test query',
        4,
        {}
      );

      expect(results).toEqual([]);
      console.log('✓ Empty vault record returns empty results');
    });
  });
});
