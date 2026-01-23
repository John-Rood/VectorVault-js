/**
 * VectorVault TypeScript - The Prince Integration Test
 * 
 * Tests real-world usage with Machiavelli's "The Prince" text.
 * Mirrors the Python VectorVault-Testing suite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Vault } from '../src/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ==================== Test Configuration ====================

const TEST_DIR = path.join(os.tmpdir(), `vectorvault_prince_${Date.now()}`);
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DATA_PATH = path.join(__dirname, 'data', 'the_prince.txt');

// ==================== Test Suite ====================

describe.skipIf(!OPENAI_KEY)('The Prince Integration Tests', () => {
  let vault: Vault;
  let princeText: string;
  let chunks: string[];

  beforeAll(() => {
    // Create test directory
    fs.mkdirSync(TEST_DIR, { recursive: true });
    console.log(`\n✓ Created test directory: ${TEST_DIR}`);

    // Load The Prince text
    princeText = fs.readFileSync(DATA_PATH, 'utf-8');
    console.log(`✓ Loaded The Prince: ${princeText.length} characters`);
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

  // ==================== Setup ====================

  describe('1. Setup & Chunking', () => {
    it('should create a vault for The Prince', () => {
      vault = new Vault({
        vault: 'the_prince',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: true
      });

      expect(vault).toBeDefined();
      console.log(`✓ Created vault: the_prince`);
    });

    it('should split The Prince into chunks', () => {
      // Split into ~500 char chunks with 100 char overlap
      chunks = vault.splitText(princeText, 100, 500);
      
      expect(chunks.length).toBeGreaterThan(100);
      console.log(`✓ Split into ${chunks.length} chunks`);
      console.log(`  Average chunk size: ${Math.round(princeText.length / chunks.length)} chars`);
    });

    it('should add all chunks to vault', async () => {
      // Add chunks with metadata
      for (let i = 0; i < chunks.length; i++) {
        vault.add(chunks[i], { 
          source: 'the_prince',
          chunk_index: i,
          author: 'Machiavelli'
        });
      }

      // Generate embeddings and save
      await vault.getVectors();
      await vault.save();

      const total = await vault.getTotalItems();
      expect(total).toBe(chunks.length);
      console.log(`✓ Added ${total} chunks to vault`);
    }, 300000); // 5 minute timeout for embeddings
  });

  // ==================== Search Tests ====================

  describe('2. Semantic Search', () => {
    it('should find passages about princes and power', async () => {
      const results = await vault.getSimilar('How should a prince maintain power?', 5);
      
      expect(results.length).toBe(5);
      
      // Should find relevant content about princes/power
      const combinedText = results.map(r => r.data.toLowerCase()).join(' ');
      const hasRelevant = combinedText.includes('prince') || combinedText.includes('power');
      expect(hasRelevant).toBe(true);
      
      console.log(`✓ Found ${results.length} results for "How should a prince maintain power?"`);
      console.log(`  Top result: "${results[0].data.slice(0, 100)}..."`);
    });

    it('should find passages about war and military', async () => {
      const results = await vault.getSimilar('military strategy and war', 5);
      
      expect(results.length).toBe(5);
      
      const combinedText = results.map(r => r.data.toLowerCase()).join(' ');
      const hasRelevant = combinedText.includes('war') || 
                         combinedText.includes('army') || 
                         combinedText.includes('arms') ||
                         combinedText.includes('soldier');
      expect(hasRelevant).toBe(true);
      
      console.log(`✓ Found ${results.length} results for "military strategy and war"`);
      console.log(`  Top result: "${results[0].data.slice(0, 100)}..."`);
    });

    it('should find passages about Cesare Borgia', async () => {
      const results = await vault.getSimilar('Cesare Borgia Duke Valentino', 5);
      
      expect(results.length).toBe(5);
      
      const combinedText = results.map(r => r.data.toLowerCase()).join(' ');
      const hasRelevant = combinedText.includes('cesare') || 
                         combinedText.includes('borgia') || 
                         combinedText.includes('valentino') ||
                         combinedText.includes('duke');
      expect(hasRelevant).toBe(true);
      
      console.log(`✓ Found ${results.length} results for "Cesare Borgia"`);
      console.log(`  Top result: "${results[0].data.slice(0, 100)}..."`);
    });

    it('should find passages about fortune and virtue', async () => {
      const results = await vault.getSimilar('fortune versus virtue in success', 5);
      
      expect(results.length).toBe(5);
      
      const combinedText = results.map(r => r.data.toLowerCase()).join(' ');
      const hasRelevant = combinedText.includes('fortune') || combinedText.includes('virtue');
      expect(hasRelevant).toBe(true);
      
      console.log(`✓ Found ${results.length} results for "fortune versus virtue"`);
      console.log(`  Top result: "${results[0].data.slice(0, 100)}..."`);
    });

    it('should find the famous quote about being feared vs loved', async () => {
      const results = await vault.getSimilar('Is it better to be feared than loved?', 5);
      
      expect(results.length).toBe(5);
      
      const combinedText = results.map(r => r.data.toLowerCase()).join(' ');
      const hasRelevant = combinedText.includes('feared') || combinedText.includes('loved');
      expect(hasRelevant).toBe(true);
      
      console.log(`✓ Found ${results.length} results for "feared vs loved"`);
      console.log(`  Top result: "${results[0].data.slice(0, 100)}..."`);
    });
  });

  // ==================== Persistence Tests ====================

  describe('3. Persistence', () => {
    it('should persist across vault reload', async () => {
      const vault2 = new Vault({
        vault: 'the_prince',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: false
      });

      const total = await vault2.getTotalItems();
      expect(total).toBe(chunks.length);
      console.log(`✓ Reloaded vault has ${total} chunks`);
    });

    it('should search correctly after reload', async () => {
      const vault2 = new Vault({
        vault: 'the_prince',
        openaiKey: OPENAI_KEY!,
        local: true,
        localDir: TEST_DIR,
        verbose: false
      });

      const results = await vault2.getSimilar('mercenary soldiers are dangerous', 3);
      expect(results.length).toBe(3);
      
      console.log(`✓ Search works after reload: ${results.length} results`);
    });
  });

  // ==================== Stats ====================

  describe('4. Statistics', () => {
    it('should report vault statistics', async () => {
      const total = await vault.getTotalItems();
      const vaults = await vault.getVaults();
      
      console.log(`\n========== The Prince Vault Stats ==========`);
      console.log(`  Total chunks: ${total}`);
      console.log(`  Source text: ${princeText.length} characters`);
      console.log(`  Average chunk: ${Math.round(princeText.length / total)} chars`);
      console.log(`  Vaults in directory: ${vaults.join(', ')}`);
      console.log(`=============================================\n`);
      
      expect(total).toBeGreaterThan(0);
    });
  });
});
