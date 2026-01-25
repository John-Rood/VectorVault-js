# VectorVault

**The first standalone vector database for TypeScript/Node.js with native FAISS-powered similarity search.**

[![npm version](https://img.shields.io/npm/v/vectorvault.svg)](https://www.npmjs.com/package/vectorvault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```typescript
import { Vault } from 'vectorvault';

const vault = new Vault({ 
  vault: 'my_knowledge', 
  openaiKey: process.env.OPENAI_API_KEY, 
  local: true 
});

vault.add('The mitochondria is the powerhouse of the cell');
vault.add('Neural networks are inspired by biological brains');
await vault.getVectors();
await vault.save();

const results = await vault.getSimilar('How do cells produce energy?');
console.log(results[0].data);
// → "The mitochondria is the powerhouse of the cell"
```

## Why VectorVault?

| Feature | VectorVault | faiss-node | Vectra | LangChain |
|---------|-------------|------------|--------|-----------|
| Native FAISS | ✅ | ✅ | ❌ JSON scan | ✅ |
| Standalone | ✅ | ✅ | ✅ | ❌ Framework |
| Persistence | ✅ | ❌ | ✅ | ✅ |
| Metadata | ✅ | ❌ | ✅ | ✅ |
| Chunking | ✅ | ❌ | ❌ | ✅ |
| Complete API | ✅ | ❌ Bindings only | ✅ | ✅ |

**VectorVault is the only library that combines native FAISS performance with a complete database API — no framework dependencies, no compromises.**

## Features

- 🚀 **Native FAISS** — Real vector similarity search using Meta's FAISS library via native bindings
- 🎯 **Zero framework dependencies** — Works standalone, not a wrapper around LangChain
- 🐍 **Python parity** — Identical API and results to VectorVault Python (verified with test suite)
- 💾 **True persistence** — Save and load indexes, metadata, vectors, and prompts
- ✂️ **Built-in chunking** — `splitText()` handles documents with configurable overlap
- 📦 **Metadata support** — Attach any JSON metadata to your vectors
- ☁️ **Cloud + Local** — Use locally or connect to VectorVault Cloud

## Installation

```bash
npm install vectorvault
```

### Local Mode (FAISS)

For local vector search, you need [faiss-node](https://www.npmjs.com/package/faiss-node):

```bash
npm install faiss-node
```

> **Note:** `faiss-node` requires native bindings. If installation fails on your platform, you can still use **Cloud Mode** which doesn't require faiss-node.

### Cloud Mode (No native dependencies)

Cloud mode connects to VectorVault Cloud and works without faiss-node:

```typescript
const vault = new Vault({
  vault: 'my_vault',
  user: 'your@email.com',
  apiKey: 'vv_your_api_key',
  local: false  // Cloud mode - no faiss-node needed
});
```

## Quick Start

### Local Mode (Recommended for Development)

```typescript
import { Vault } from 'vectorvault';

// Create a local vault
const vault = new Vault({
  vault: 'my_vault',
  openaiKey: process.env.OPENAI_API_KEY,
  local: true,
  localDir: './data'  // Optional: defaults to ./vaults
});

// Add items with optional metadata
vault.add('First document content', { source: 'doc1', category: 'science' });
vault.add('Second document content', { source: 'doc2', category: 'history' });

// Generate embeddings and save
await vault.getVectors();
await vault.save();

// Search
const results = await vault.getSimilar('your search query', 5);
for (const result of results) {
  console.log(result.data);      // The text
  console.log(result.metadata);  // Your metadata
  console.log(result.distance);  // Similarity distance
}
```

### Working with Documents

```typescript
import * as fs from 'fs';

// Load a document
const text = fs.readFileSync('book.txt', 'utf-8');

// Split into chunks (overlap, maxLength)
const chunks = vault.splitText(text, 100, 500);
console.log(`Split into ${chunks.length} chunks`);

// Add all chunks
for (const chunk of chunks) {
  vault.add(chunk, { source: 'book.txt' });
}

await vault.getVectors();
await vault.save();
```

### Cloud Mode

```typescript
import { Vault } from 'vectorvault';

const vault = new Vault({
  vault: 'my_cloud_vault',
  user: 'your@email.com',
  apiKey: 'vv_your_api_key',
  local: false
});

// Same API as local mode
vault.add('Document content');
await vault.getVectors();
await vault.save();

const results = await vault.getSimilar('query');
```

## API Reference

### Constructor Options

```typescript
interface VaultConfig {
  vault: string;              // Vault name
  openaiKey?: string;         // OpenAI API key (for embeddings)
  local?: boolean;            // Use local storage (default: false)
  localDir?: string;          // Local storage directory
  user?: string;              // VectorVault Cloud username
  apiKey?: string;            // VectorVault Cloud API key
  verbose?: boolean;          // Enable logging
}
```

### Core Methods

| Method | Description |
|--------|-------------|
| `add(text, metadata?)` | Add text to the vault with optional metadata |
| `getVectors()` | Generate embeddings for pending items |
| `save()` | Persist the vault to disk/cloud |
| `getSimilar(query, n?)` | Find n most similar items (default: 4) |
| `getItems(ids)` | Retrieve items by ID |
| `editItem(id, newText)` | Update item text |
| `deleteItems(ids)` | Remove items |
| `getTotalItems()` | Get item count |
| `getVaults()` | List all vaults in directory |
| `delete()` | Delete the entire vault |

### Utility Methods

| Method | Description |
|--------|-------------|
| `splitText(text, overlap?, maxLength?)` | Split text into chunks |
| `getItemVector(id)` | Get raw vector for an item |
| `getDistance(id1, id2)` | Calculate distance between two items |

### Prompt Management

| Method | Description |
|--------|-------------|
| `savePersonalityMessage(msg)` | Save a system personality message |
| `fetchPersonalityMessage()` | Retrieve the personality message |
| `saveCustomPrompt(prompt, withContext)` | Save a custom prompt template |
| `fetchCustomPrompt(withContext)` | Retrieve a custom prompt |

## How It Works

VectorVault uses a hybrid architecture:

1. **Embeddings** — Generated via OpenAI's `text-embedding-3-small` (1536 dimensions)
2. **Vector Index** — Native FAISS `IndexFlatIP` with L2 normalization (cosine similarity)
3. **Storage** — JSON metadata files + FAISS binary index for fast loading
4. **Search** — Query embedding → FAISS search → Return ranked results with metadata

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Add Text  │ ──▶ │   Embeddings │ ──▶ │ FAISS Index │
└─────────────┘     │   (OpenAI)   │     └─────────────┘
                    └──────────────┘            │
                                               ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Results   │ ◀── │  Re-rank by  │ ◀── │   Search    │
│  + Metadata │     │   Distance   │     │   (FAISS)   │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Performance

Tested with "The Prince" by Machiavelli (302KB, 264 chunks):

| Operation | Time |
|-----------|------|
| Chunking | <10ms |
| Embedding (264 items) | ~3-5s |
| Save to disk | <50ms |
| Load from disk | <100ms |
| Search query | <500ms |

## Python Parity

VectorVault TypeScript produces **identical results** to [VectorVault Python](https://github.com/John-Rood/VectorVault):

```
Python:  "On the other hand, Cesare Borgia, called by the people Duke Valentino..."
TypeScript: "On the other hand, Cesare Borgia, called by the people Duke Valentino..."
✅ Same chunks, same search results, same API
```

If you're migrating from Python or building cross-platform applications, your vectors and results will match exactly.

## Requirements

- Node.js 18+
- OpenAI API key (for embeddings)
- macOS, Linux, or Windows (native FAISS binaries)

## Related Projects

- [VectorVault Python](https://github.com/John-Rood/VectorVault) — The original Python implementation
- [VectorVault Cloud](https://vectorvault.io) — Managed vector database service

## License

MIT © [John Rood](https://github.com/John-Rood)

---

<p align="center">
  <b>Built by <a href="https://github.com/John-Rood">John Rood</a></b><br>
  Creator of the world's first serverless vector database
</p>
