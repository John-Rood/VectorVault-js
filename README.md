# VectorVault

**The only fully native TypeScript vector database.**

[![npm version](https://img.shields.io/npm/v/vectorvault.svg)](https://www.npmjs.com/package/vectorvault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

VectorVault is a complete vector database for Node.js with a search engine written from scratch in TypeScript. No native bindings, no C++ addons, no platform-specific binaries, and zero runtime dependencies in `package.json`. If Node.js 18+ runs, VectorVault runs. It is the TypeScript sibling of [VectorVault Python](https://github.com/John-Rood/VectorVault), the first serverless vector database (2023), and it shares the same API shape, chunking algorithm, distance metric, and cloud backend.

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
// "The mitochondria is the powerhouse of the cell"
```

## Why VectorVault?

Most vector search options for Node.js are thin bindings around a C++ or Rust core. They are fast, but they bring a native toolchain, prebuilt binaries per platform, and install failures on anything unusual (Alpine, ARM servers, locked-down CI, serverless bundlers). VectorVault takes the other path: the entire engine is TypeScript, so it installs the same way everywhere and bundles like any other JavaScript module.

| | VectorVault | faiss-node | hnswlib-node | Vectra | LanceDB |
|---|---|---|---|---|---|
| Native bindings required | No | Yes (C++ addon) | Yes (C++ addon) | No | Yes (platform binaries) |
| Search engine language | TypeScript | C++ (FAISS) | C++ (hnswlib) | TypeScript | Rust |
| Runtime dependencies | 0 | 3 | 2 | 13 | 2 plus a platform binary |
| Search | Exact (cosine) | Exact or approximate, by index type | Approximate (HNSW) | Exact (cosine) | Exact scan or approximate (IVF, HNSW) |
| Persistence | Yes, per vault on disk | Manual index file only | Manual index file only | Yes, folder per index | Yes, Lance format |
| Metadata stored with vectors | Yes | No | No | Yes | Yes |
| Metadata filtering | No | No | No | Yes | Yes |
| Built-in text chunking | Yes | No | No | Yes | No |
| Embeddings built in | OpenAI, Gemini | No | No | Yes | Optional |
| RAG chat and streaming | Yes | No | No | No | No |
| Complete database API (add, get, edit, delete, list, export) | Yes | Index only | Index only | Yes | Yes |
| Managed cloud option | Yes (VectorVault Cloud) | No | No | No | Yes (LanceDB Cloud) |

Dependency counts are from `npm view <package> dependencies` in September 2026 and will drift; check them yourself. LanceDB's platform binaries ship as optional dependencies. Vectra is the closest comparison: also pure TypeScript and exact search, with metadata filtering that VectorVault does not have, while VectorVault adds RAG chat, multi-vault search, and a managed cloud with the same API.

## How the engine works

The search engine lives in one file, `src/vectors/memory.ts`, in the `MemoryVectorIndex` class. There is nothing hidden behind it.

1. **Normalize on add.** Every vector is L2-normalized when it enters the index and stored as a `Float32Array` keyed by integer id in a `Map`.
2. **Exact inner-product search.** A query is normalized the same way, then the engine computes the inner product against every stored vector. On unit vectors the inner product is the cosine similarity, so this is exact cosine search over the whole vault, not an approximation.
3. **Rank and return.** Results are sorted by similarity and the top `n` are returned as angular distance, `sqrt(2 * (1 - cosine))`. Lower is closer: 0 means identical direction, about 1.414 means orthogonal, 2 means opposite. This is the same metric the Python library returns, so distances are comparable across the two implementations.
4. **Persist to disk.** `save()` writes two files atomically (temp file plus rename): `vectors.bin`, a packed little-endian binary with an 8-byte header (dims, count) followed by `int32 id + float32[dims]` records, and `vectors.meta.jsonl`, a JSON Lines file with a `{"dims":N}` header line followed by one `{"id":..., "vector":[...]}` line per item. `load()` reads the binary and falls back to the JSONL if needed.
5. **Legacy migration.** Vaults written by the 2.2.x releases (which used FAISS) are picked up automatically from their `vectors.faiss.meta.jsonl` or `vectors.faiss.meta.json` files and re-saved in the current format. The old FAISS binary index is not read; the vectors themselves were always stored in the metadata file, so nothing is lost.

**The tradeoff, stated plainly.** Exact search costs one pass over every vector per query, so query time grows linearly with vault size and dimension. There is no approximate index to build, tune, or get wrong, results are deterministic, and recall is 100 percent by construction. This fits the sub-million-vector vaults this library is built for: personal and team knowledge bases, agent memory, document collections, and per-tenant stores. If you need approximate nearest-neighbor search over tens of millions of vectors on one machine, use a dedicated ANN engine or VectorVault Cloud.

## Features

- **Pure TypeScript engine.** Exact cosine search, written from scratch, zero native code.
- **Zero runtime dependencies.** Embedding and chat providers are called with the built-in `fetch`, not SDKs.
- **Local mode.** Vaults live on your filesystem under `~/.vectorvault/<vault>` (configurable) with text, metadata, and vectors persisted per item.
- **Cloud mode.** The same `Vault` API against [VectorVault Cloud](https://vectorvault.io), including cloud flows.
- **Embeddings built in.** OpenAI `text-embedding-3-small` (default, 1536 dims), `text-embedding-3-large`, `text-embedding-ada-002`, and Gemini `text-embedding-004` / `text-embedding-005` / `embedding-001` (768 dims), auto-selected from the model name, with retry and exponential backoff on rate limits.
- **RAG chat.** `getChat()` and `getChatStream()` retrieve context from the vault and answer with OpenAI or Anthropic models, with history, smart history search, custom prompts, and context return.
- **Metadata.** Attach any JSON to an item; it is stored alongside the text and returned with every result.
- **Sentence-aware chunking.** `splitText()` builds chunks on sentence boundaries between a minimum and maximum size.
- **Multi-vault search.** `getSimilarFromVaults()` searches one vault, merges several, or enforces per-vault minimums.
- **Full CRUD.** Add, get by id, edit (re-embeds), delete (with stable ids and an optional deferred mode), count, list vaults, delete vault, duplicate vault.
- **Import and export.** `downloadToJson()` and `uploadFromJson()` round-trip a whole vault.
- **Prompt storage.** Save and fetch a personality message and custom prompts per vault.
- **Python parity.** Same method names, same `splitText` algorithm, same angular-distance metric as VectorVault Python. The test suite mirrors the Python suite, including a full run over Machiavelli's *The Prince*.

## Installation

```bash
npm install vectorvault
```

Requirements: Node.js 18 or newer. That is the whole list. The engine uses `node:fs`, `node:path`, `node:os`, and `node:crypto`, so it targets Node.js; Bun and Deno are untested. For embeddings and chat you supply your own provider key (OpenAI, Gemini, Anthropic). For cloud mode you supply VectorVault Cloud credentials.

## Usage

### Local mode

```typescript
import { Vault } from 'vectorvault';

const vault = new Vault({
  vault: 'my_vault',
  openaiKey: process.env.OPENAI_API_KEY,
  local: true,
  localDir: './data'   // optional, defaults to ~/.vectorvault
});

vault.add('First document content', { source: 'doc1', category: 'science' });
vault.add('Second document content', { source: 'doc2', category: 'history' });

await vault.getVectors();   // embed pending items and add them to the index
await vault.save();         // write text, metadata, mapping, and vectors to disk

const results = await vault.getSimilar('your search query', 5);
for (const r of results) {
  console.log(r.data);       // the text
  console.log(r.metadata);   // your metadata plus item_id, name, created, updated
  console.log(r.distance);   // angular distance, lower is closer
}
```

`addAndSave(text, meta)` does the three-step add, embed, save in one call.

### Documents and chunking

```typescript
import * as fs from 'node:fs';

const text = fs.readFileSync('book.txt', 'utf-8');

// splitText(text, minChunk = 1000, maxChunk = 16000) in characters, on sentence boundaries
const chunks = vault.splitText(text, 100, 500);

for (const chunk of chunks) {
  vault.add(chunk, { source: 'book.txt' });
}
await vault.getVectors();
await vault.save();
```

### Gemini embeddings

```typescript
const vault = new Vault({
  vault: 'gemini_vault',
  geminiKey: process.env.GEMINI_API_KEY,
  embeddingsModel: 'text-embedding-004',   // 768 dims, set automatically
  local: true
});
```

For OpenAI `text-embedding-3-large`, pass `embeddingsModel: 'text-embedding-3-large'` and `dims: 3072`.

### Search across vaults

```typescript
// one other vault
await vault.getSimilarFromVaults('query', 4, 'other_vault');

// several vaults, merged, global top 4
await vault.getSimilarFromVaults('query', 4, ['vault_a', 'vault_b']);

// at least 2 from vault_a and 1 from vault_b, remaining slots filled by best distance
await vault.getSimilarFromVaults('query', 6, { vault_a: 2, vault_b: 1 });
```

### RAG chat

```typescript
// Plain chat (OpenAI by default, gpt-4o-mini)
const answer = await vault.getChat('Hello!');

// Retrieval-augmented: search the vault, then answer with the context
const answer = await vault.getChat('What do my notes say about mitochondria?', {
  getContext: true,
  nContext: 4
});

// Get the retrieved context back too
const { response, context } = await vault.getChat('Question?', {
  getContext: true,
  returnContext: true
});

// Streaming
for await (const token of vault.getChatStream('Summarize my notes', { getContext: true })) {
  if (token === '!END') break;
  process.stdout.write(token);
}
```

Set `chatModel` to any Anthropic model id (they start with `claude-`) and pass `anthropicKey` to route chat through Anthropic. Every other model id goes to OpenAI.

### Cloud mode

```typescript
const vault = new Vault({
  vault: 'my_cloud_vault',
  user: 'your@email.com',
  apiKey: 'vv_your_api_key',
  local: false
});

vault.add('Document content');
await vault.getVectors();   // no-op in cloud mode, embeddings are generated server-side
await vault.save();         // uploads pending items

const results = await vault.getSimilar('query');

// Cloud flows (VectorVault Cloud only)
const reply = await vault.runFlow('my-assistant', 'Hello!');
for await (const token of vault.streamFlow('my-assistant', 'Hello!')) {
  process.stdout.write(token);
}
```

### Import and export

```typescript
const json = await vault.downloadToJson(true);   // include metadata
fs.writeFileSync('backup.json', json);

await vault.uploadFromJson(json);                // replaces vault contents
const copy = await vault.duplicateVault('my_vault_backup');
```

## API reference

### `new Vault(config)`

```typescript
interface VaultConfig {
  vault: string;             // vault name (required)
  local?: boolean;           // local filesystem mode (default: true)
  localDir?: string;         // base directory (default: ~/.vectorvault)
  openaiKey?: string;        // OpenAI key for embeddings and chat
  geminiKey?: string;        // Gemini key, auto-selected for Gemini embedding models
  anthropicKey?: string;     // Anthropic key, auto-selected for claude-* chat models
  embeddingsModel?: string;  // default: 'text-embedding-3-small'
  dims?: number;             // default: 1536 (768 is set automatically for Gemini)
  chatModel?: string;        // default: 'gpt-4o-mini'
  chatTemperature?: number;  // default: 0
  user?: string;             // VectorVault Cloud email (cloud mode)
  apiKey?: string;           // VectorVault Cloud API key (cloud mode)
  verbose?: boolean;         // log to console
}
```

### Items and search

| Method | Description |
|---|---|
| `add(text, meta?)` | Queue text with optional metadata |
| `getVectors()` | Embed queued items and add them to the index |
| `save()` | Persist items, mapping, and vectors |
| `addAndSave(text, meta?)` | Add, embed, and save in one call |
| `getSimilar(text, n = 4)` | Exact cosine search, returns `{ data, metadata, distance }[]` |
| `embedText(text)` | Return the embedding for a string (local mode) |
| `searchByVector(vector, n = 4)` | Search with a precomputed embedding (local mode) |
| `getSimilarFromVaults(text, n, vaults)` | Search one vault, several merged, or with per-vault minimums |
| `getItems(ids)` | Fetch items by integer id |
| `editItem(id, newText)` | Replace text and re-embed |
| `deleteItems(ids, { defer? })` | Delete items; ids stay stable. `defer: true` skips the disk rewrite |
| `getTotalItems()` | Item count |
| `getDistance(id1, id2)` | Angular distance between two stored items |
| `getItemVector(id)` | Raw normalized vector for an item (local mode) |

### Vault management

| Method | Description |
|---|---|
| `getVaults()` | List vaults in the base directory (or your cloud account) |
| `delete()` | Delete this vault |
| `createVault(name?)` | Create a cloud vault (local vaults are created on first save) |
| `duplicateVault(name)` | Copy all items and prompts into a new vault |
| `downloadToJson(includeMeta?)` | Export every item as JSON |
| `uploadFromJson(json)` | Replace vault contents from JSON |
| `preloadCache(maxConcurrent?)` | Warm item reads before a batch of searches |
| `isLocalMode()` | `true` in local mode |

### Chat and flows

| Method | Description |
|---|---|
| `getChat(text, options?)` | Chat, optionally with vault context (`getContext`, `nContext`, `returnContext`, `history`, `historySearch`, `smartHistorySearch`, `customPrompt`, `model`, `temperature`, `timeout`) |
| `getChatStream(text, options?)` | Same, as an async generator of tokens ending in `'!END'` |
| `printStream(stream, printing?)` | Consume a stream, print it, and return the full text |
| `runFlow(name, message, options?)` | Run a VectorVault Cloud flow (cloud mode) |
| `streamFlow(name, message, options?)` | Stream a VectorVault Cloud flow (cloud mode) |

### Prompts

| Method | Description |
|---|---|
| `savePersonalityMessage(msg)` / `fetchPersonalityMessage()` | Per-vault system personality |
| `saveCustomPrompt(prompt, withContext?)` / `fetchCustomPrompt(withContext?)` | Per-vault prompt templates (`{content}` and `{context}` placeholders) |

### Utilities

| Method | Description |
|---|---|
| `splitText(text, minChunk = 1000, maxChunk = 16000)` | Sentence-aware chunking by character count |

### Lower-level exports

For advanced use the building blocks are exported directly: `MemoryVectorIndex` (the engine), `LocalStorageManager`, `CloudStorageManager`, `OpenAIEmbeddings`, `GeminiEmbeddings`, `LLMClient`, `OpenAIChatClient`, `AnthropicChatClient`, `RateLimiter`, `sleep`, and the `VaultConfig`, `Item`, `ItemMetadata`, `SearchResult`, `VectorIndex`, `StorageManager`, `EmbeddingsProvider`, `ChatOptions`, and `FlowOptions` types.

```typescript
import { MemoryVectorIndex } from 'vectorvault';

const index = new MemoryVectorIndex(3);
index.add(0, [1, 0, 0]);
index.add(1, [0, 1, 0]);
index.build();
index.search([1, 0.1, 0], 1);   // { ids: [0], distances: [0.0996...] }
```

## On-disk layout (local mode)

```
~/.vectorvault/<vault>/
  items/<uuid>.txt        item text
  meta/<uuid>.json        item metadata
  mapping.json            integer id to uuid
  vectors.bin             packed Float32 vectors with ids
  vectors.meta.jsonl      same vectors as JSON Lines (header line holds dims)
  vault_meta.json         vault-level metadata
  prompts.json            personality and custom prompts
```

All writes go through a temp file and rename, so a crash mid-save leaves the previous good files in place.

## Migrating from 2.2.x (the FAISS era)

Versions 2.2.0 through 2.2.2 used the `faiss-node` native addon for local search. Starting with 2.2.3 the engine is the pure TypeScript `MemoryVectorIndex` described above, and `faiss-node` is gone from the dependency tree. (2.2.3 itself is deprecated on npm for an unrelated packaging mistake; use 2.2.4 or newer.)

- **Code:** no changes. `Vault` has the same methods and the same result shape. Distances are still angular distance, so thresholds you tuned carry over.
- **Installed packages:** you can `npm uninstall faiss-node`. Nothing in `vectorvault` imports it.
- **Existing vaults:** open them as usual. The loader finds `vectors.faiss.meta.jsonl` (or the older `vectors.faiss.meta.json`, which it converts first), rebuilds the index from the stored vectors, and the next `save()` writes `vectors.bin` and `vectors.meta.jsonl`. The `vectors.faiss` binary is ignored and can be deleted once you have re-saved.
- **Results:** FAISS `IndexFlatIP` was already exact inner-product search over normalized vectors, which is the same computation the TypeScript engine performs, so rankings match up to floating-point noise.

## Python parity

VectorVault Python and VectorVault TypeScript are built to be interchangeable: the same method names, the same sentence-boundary `splitText`, the same angular-distance metric, and the same VectorVault Cloud API behind cloud mode. The TypeScript test suite is modeled on the Python one, including the full *The Prince* integration run (chunk, embed, search, persist, reload).

## Related

- [VectorVault Python](https://github.com/John-Rood/VectorVault), the original library and the first serverless vector database
- [VectorVault Cloud](https://vectorvault.io), managed vaults and flows with the same API
- [vectorvault on npm](https://www.npmjs.com/package/vectorvault)

## License

MIT, [John Rood](https://github.com/John-Rood)
