/**
 * Local Filesystem Storage Manager
 * 
 * Stores vault data on the local filesystem.
 * Directory structure:
 *   ~/.vectorvault/{vault_name}/
 *     ├── items/{uuid}.txt      - Item text content
 *     ├── meta/{uuid}.json      - Item metadata
 *     ├── vectors.faiss         - FAISS index file
 *     ├── vectors.faiss.meta.json - Vector metadata (for reconstruction)
 *     ├── mapping.json          - ID to UUID mapping
 *     ├── vault_meta.json       - Vault metadata
 *     └── prompts.json          - Custom prompts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { StorageManager, ItemMetadata } from '../types.js';

export class LocalStorageManager implements StorageManager {
  private baseDir: string;
  private vaultDir: string;
  private vaultName: string;

  constructor(vault: string, baseDir?: string) {
    this.vaultName = vault;
    this.baseDir = baseDir 
      ? path.resolve(baseDir.replace(/^~/, os.homedir()))
      : path.join(os.homedir(), '.vectorvault');
    this.vaultDir = path.join(this.baseDir, vault);
    this.ensureDirs();
  }

  /**
   * Create necessary directory structure
   */
  private ensureDirs(): void {
    const dirs = [
      this.vaultDir,
      path.join(this.vaultDir, 'items'),
      path.join(this.vaultDir, 'meta')
    ];
    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Atomically write content to a file using temp + rename
   */
  private atomicWrite(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  /**
   * Safely read file content, returning null if not found
   */
  private safeRead(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  // ==================== Item Operations ====================

  async upload(uuid: string, text: string, meta: ItemMetadata): Promise<void> {
    // Save item text
    const itemPath = path.join(this.vaultDir, 'items', `${uuid}.txt`);
    this.atomicWrite(itemPath, text);

    // Save item metadata
    const metaPath = path.join(this.vaultDir, 'meta', `${uuid}.json`);
    this.atomicWrite(metaPath, JSON.stringify(meta, null, 2));
  }

  async downloadText(itemPath: string): Promise<string | null> {
    // Handle both direct paths and uuid-based paths
    if (fs.existsSync(itemPath)) {
      return this.safeRead(itemPath);
    }
    
    // Try as UUID
    const fullPath = path.join(this.vaultDir, 'items', `${itemPath}.txt`);
    return this.safeRead(fullPath);
  }

  async deleteItem(uuid: string): Promise<void> {
    const itemPath = path.join(this.vaultDir, 'items', `${uuid}.txt`);
    const metaPath = path.join(this.vaultDir, 'meta', `${uuid}.json`);

    try { fs.unlinkSync(itemPath); } catch { /* ignore */ }
    try { fs.unlinkSync(metaPath); } catch { /* ignore */ }
  }

  async itemExists(uuid: string): Promise<boolean> {
    const itemPath = path.join(this.vaultDir, 'items', `${uuid}.txt`);
    return fs.existsSync(itemPath);
  }

  /**
   * Get item text by UUID
   */
  async getItemText(uuid: string): Promise<string | null> {
    const itemPath = path.join(this.vaultDir, 'items', `${uuid}.txt`);
    return this.safeRead(itemPath);
  }

  /**
   * Get item metadata by UUID
   */
  async getItemMeta(uuid: string): Promise<ItemMetadata | null> {
    const metaPath = path.join(this.vaultDir, 'meta', `${uuid}.json`);
    const content = this.safeRead(metaPath);
    if (content) {
      try {
        return JSON.parse(content) as ItemMetadata;
      } catch {
        return null;
      }
    }
    return null;
  }

  // ==================== Mapping Operations ====================

  async getMapping(): Promise<Record<string, string>> {
    const mappingPath = path.join(this.vaultDir, 'mapping.json');
    const content = this.safeRead(mappingPath);
    if (content) {
      try {
        return JSON.parse(content) as Record<string, string>;
      } catch {
        return {};
      }
    }
    return {};
  }

  async saveMapping(mapping: Record<string, string>): Promise<void> {
    const mappingPath = path.join(this.vaultDir, 'mapping.json');
    this.atomicWrite(mappingPath, JSON.stringify(mapping, null, 2));
  }

  // ==================== Vector Operations ====================

  async saveVectors(indexPath: string, metaPath: string): Promise<void> {
    // Vectors are saved directly by FAISSIndex, this just ensures paths are in vault
    const destIndex = path.join(this.vaultDir, 'vectors.faiss');
    const destMeta = path.join(this.vaultDir, 'vectors.faiss.meta.json');

    if (indexPath !== destIndex) {
      fs.copyFileSync(indexPath, destIndex);
    }
    if (metaPath !== destMeta) {
      fs.copyFileSync(metaPath, destMeta);
    }
  }

  async loadVectors(): Promise<{ indexPath: string; metaPath: string } | null> {
    const indexPath = path.join(this.vaultDir, 'vectors.faiss');
    const metaPath = path.join(this.vaultDir, 'vectors.faiss.meta.json');

    if (fs.existsSync(indexPath) && fs.existsSync(metaPath)) {
      return { indexPath, metaPath };
    }
    return null;
  }

  /**
   * Get path for vectors index file
   */
  getVectorsIndexPath(): string {
    return path.join(this.vaultDir, 'vectors.faiss');
  }

  /**
   * Get path for vectors meta file
   */
  getVectorsMetaPath(): string {
    return path.join(this.vaultDir, 'vectors.faiss.meta.json');
  }

  // ==================== Vault Operations ====================

  async listVaults(): Promise<string[]> {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    const vaults: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const mappingPath = path.join(this.baseDir, entry.name, 'mapping.json');
        if (fs.existsSync(mappingPath)) {
          vaults.push(entry.name);
        }
      }
    }

    return vaults.sort();
  }

  async deleteVault(): Promise<void> {
    if (fs.existsSync(this.vaultDir)) {
      fs.rmSync(this.vaultDir, { recursive: true, force: true });
    }
  }

  // ==================== Prompts & Personality ====================

  private getPromptsPath(): string {
    return path.join(this.vaultDir, 'prompts.json');
  }

  private async getPrompts(): Promise<Record<string, string>> {
    const content = this.safeRead(this.getPromptsPath());
    if (content) {
      try {
        return JSON.parse(content) as Record<string, string>;
      } catch {
        return {};
      }
    }
    return {};
  }

  private async savePrompts(prompts: Record<string, string>): Promise<void> {
    this.atomicWrite(this.getPromptsPath(), JSON.stringify(prompts, null, 2));
  }

  async savePersonalityMessage(message: string): Promise<void> {
    const prompts = await this.getPrompts();
    prompts.personality = message;
    await this.savePrompts(prompts);
  }

  async getPersonalityMessage(): Promise<string | null> {
    const prompts = await this.getPrompts();
    return prompts.personality ?? null;
  }

  async saveCustomPrompt(prompt: string, withContext: boolean): Promise<void> {
    const prompts = await this.getPrompts();
    if (withContext) {
      prompts.with_context = prompt;
    } else {
      prompts.no_context = prompt;
    }
    await this.savePrompts(prompts);
  }

  async getCustomPrompt(withContext: boolean): Promise<string | null> {
    const prompts = await this.getPrompts();
    return withContext ? (prompts.with_context ?? null) : (prompts.no_context ?? null);
  }

  // ==================== Metadata ====================

  async getVaultMeta(): Promise<Record<string, unknown>> {
    const metaPath = path.join(this.vaultDir, 'vault_meta.json');
    const content = this.safeRead(metaPath);
    if (content) {
      try {
        return JSON.parse(content) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }

  async saveVaultMeta(meta: Record<string, unknown>): Promise<void> {
    const metaPath = path.join(this.vaultDir, 'vault_meta.json');
    this.atomicWrite(metaPath, JSON.stringify(meta, null, 2));
  }
}
