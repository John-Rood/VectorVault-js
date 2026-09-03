/**
 * VectorVault TypeScript - Stable ID Regression Tests
 *
 * Since 7f84d19, deleting a local item does not renumber the remaining items,
 * so item IDs can have gaps. These tests pin down that every bulk operation
 * enumerates the real IDs instead of assuming they are 0..count-1.
 *
 * Embeddings are mocked with a deterministic provider, so this suite needs
 * no API key and no network.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const DIMS = 8;

// Deterministic fake embeddings: hash the text into a small vector.
vi.mock('../src/embeddings/openai.js', () => {
  class OpenAIEmbeddings {
    getDims(): number {
      return DIMS;
    }
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map(text => {
        const vec = new Array(DIMS).fill(0);
        for (let i = 0; i < text.length; i++) {
          vec[i % DIMS] += text.charCodeAt(i) / 255;
        }
        vec[0] += 1; // never a zero vector
        return vec;
      });
    }
    async embedOne(text: string): Promise<number[]> {
      return (await this.embed([text]))[0];
    }
  }
  return { OpenAIEmbeddings };
});

import { Vault } from '../src/index.js';

const TEST_DIR = path.join(os.tmpdir(), `vectorvault_stable_ids_${Date.now()}`);

function makeVault(name: string): Vault {
  return new Vault({
    vault: name,
    openaiKey: 'test-key-not-used',
    local: true,
    localDir: TEST_DIR,
    dims: DIMS,
  });
}

async function addItems(vault: Vault, texts: string[]): Promise<void> {
  for (const text of texts) vault.add(text);
  await vault.getVectors();
  await vault.save();
}

describe('Stable IDs after delete', () => {
  beforeAll(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('deleteItems keeps remaining IDs stable and leaves a gap', async () => {
    const vault = makeVault('gap_basic');
    await addItems(vault, ['alpha', 'beta', 'gamma', 'delta']);

    await vault.deleteItems([1]);

    expect(await vault.getTotalItems()).toBe(3);
    expect(await vault.listItemIds()).toEqual([0, 2, 3]);

    const [gamma] = await vault.getItems([2]);
    expect(gamma.data).toBe('gamma');
    expect(await vault.getItems([1])).toEqual([]);
  });

  it('items added after a delete get a fresh ID, not the freed one', async () => {
    const vault = makeVault('gap_append');
    await addItems(vault, ['a', 'b', 'c']);
    await vault.deleteItems([0]);
    await addItems(vault, ['d']);

    expect(await vault.listItemIds()).toEqual([1, 2, 3]);
    const [d] = await vault.getItems([3]);
    expect(d.data).toBe('d');
  });

  it('gaps survive a reload from disk', async () => {
    const vault = makeVault('gap_reload');
    await addItems(vault, ['a', 'b', 'c']);
    await vault.deleteItems([1]);

    const reloaded = makeVault('gap_reload');
    expect(await reloaded.listItemIds()).toEqual([0, 2]);

    await addItems(reloaded, ['d']);
    expect(await reloaded.listItemIds()).toEqual([0, 2, 3]);
  });

  it('uploadFromJson replaces every item even when IDs have gaps', async () => {
    const vault = makeVault('gap_upload');
    await addItems(vault, ['a', 'b', 'c', 'd']);
    await vault.deleteItems([0]); // IDs are now 1, 2, 3

    await vault.uploadFromJson({
      '0': { data: 'one' },
      '1': { data: 'two' },
      '2': { data: 'three' },
    });

    expect(await vault.getTotalItems()).toBe(3);
    expect(await vault.listItemIds()).toEqual([0, 1, 2]);
    const items = await vault.getItems([0, 1, 2]);
    expect(items.map(i => i.data)).toEqual(['one', 'two', 'three']);

    // Old items must be gone from disk, not just from the mapping
    const exported = JSON.parse(await vault.downloadToJson());
    expect(Object.keys(exported)).toEqual(['0', '1', '2']);
  });

  it('duplicateVault copies every item even when IDs have gaps', async () => {
    const vault = makeVault('gap_dup_src');
    await addItems(vault, ['a', 'b', 'c', 'd']);
    await vault.deleteItems([0, 2]); // IDs are now 1, 3

    const clone = await vault.duplicateVault('gap_dup_dst');

    expect(await clone.getTotalItems()).toBe(2);
    const items = await clone.getItems(await clone.listItemIds());
    expect(items.map(i => i.data).sort()).toEqual(['b', 'd']);
  });

  it('downloadToJson exports by real ID', async () => {
    const vault = makeVault('gap_export');
    await addItems(vault, ['a', 'b', 'c']);
    await vault.deleteItems([1]);

    const exported = JSON.parse(await vault.downloadToJson());
    expect(Object.keys(exported).sort()).toEqual(['0', '2']);
    expect(exported['2'].data).toBe('c');
  });

  it('search never returns a deleted ID', async () => {
    const vault = makeVault('gap_search');
    await addItems(vault, ['a', 'b', 'c', 'd']);
    await vault.deleteItems([2]);

    const results = await vault.getSimilar('c', 10);
    expect(results.length).toBe(3);
    for (const r of results) {
      expect(r.metadata.item_id).not.toBe(2);
    }
  });
});
