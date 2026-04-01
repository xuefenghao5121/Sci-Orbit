import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { configService } from "./config.js";
import { validatePath } from "../security/validator.js";

type EntityType = "papers" | "experiments" | "knowledge";

const ENTITY_DIRS: Record<EntityType, string> = {
  papers: "papers",
  experiments: "experiments",
  knowledge: "knowledge",
};

function getEntityDir(type: EntityType): string {
  const base = configService.get("storage").basePath;
  return path.join(base, ENTITY_DIRS[type]);
}

function entityPath(type: EntityType, id: string, ext = ".json"): string {
  validatePath(id);
  return path.join(getEntityDir(type), `${id}${ext}`);
}

function indexPath(type: EntityType): string {
  return path.join(getEntityDir(type), ".index.json");
}

export interface StorageRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface IndexEntry {
  id: string;
  updatedAt: string;
  keywords: string[];
}

interface StorageIndex {
  entries: IndexEntry[];
  version: number;
}

const INDEX_VERSION = 1;

function extractKeywords(record: StorageRecord): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.length >= 2 && !seen.has(lower)) {
      seen.add(lower);
      keys.push(lower);
    }
  };
  for (const v of Object.values(record)) {
    if (typeof v === "string") {
      for (const word of v.split(/[\s,._\-/]+/)) add(word);
    }
  }
  return keys;
}

export class StorageService {
  private indexes: Map<EntityType, StorageIndex> = new Map();

  private ensureDir(type: EntityType): void {
    const dir = getEntityDir(type);
    fs.mkdirSync(dir, { recursive: true });
  }

  private loadIndex(type: EntityType): StorageIndex {
    const cached = this.indexes.get(type);
    if (cached) return cached;

    const fp = indexPath(type);
    try {
      if (fs.existsSync(fp)) {
        const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
        const idx = { entries: data.entries ?? [], version: data.version ?? 0 };
        this.indexes.set(type, idx);
        return idx;
      }
    } catch { /* ignore */ }

    const idx: StorageIndex = { entries: [], version: INDEX_VERSION };
    this.indexes.set(type, idx);
    return idx;
  }

  private saveIndex(type: EntityType): void {
    const idx = this.indexes.get(type);
    if (!idx) return;
    this.ensureDir(type);
    fs.writeFileSync(indexPath(type), JSON.stringify(idx), "utf-8");
  }

  private updateIndexEntry(type: EntityType, record: StorageRecord): void {
    const idx = this.loadIndex(type);
    const existing = idx.entries.findIndex((e) => e.id === record.id);
    const entry: IndexEntry = {
      id: record.id,
      updatedAt: record.updatedAt,
      keywords: extractKeywords(record),
    };
    if (existing >= 0) idx.entries[existing] = entry;
    else idx.entries.push(entry);
    this.saveIndex(type);
  }

  private removeIndexEntry(type: EntityType, id: string): void {
    const idx = this.loadIndex(type);
    idx.entries = idx.entries.filter((e) => e.id !== id);
    this.saveIndex(type);
  }

  list(type: EntityType): string[] {
    const dir = getEntityDir(type);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .map((f) => f.replace(".json", ""));
  }

  get<T extends StorageRecord>(type: EntityType, id: string): T | null {
    const fp = entityPath(type, id);
    if (!fs.existsSync(fp)) return null;
    try {
      return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
    } catch {
      return null;
    }
  }

  put<T extends StorageRecord>(type: EntityType, record: T): void {
    this.ensureDir(type);
    record.updatedAt = new Date().toISOString();
    if (!record.createdAt) record.createdAt = record.updatedAt;
    const fp = entityPath(type, record.id);
    fs.writeFileSync(fp, JSON.stringify(record, null, 2) + "\n", "utf-8");
    this.updateIndexEntry(type, record);
  }

  /** Stream write for large records */
  async putStream(type: EntityType, id: string, source: Readable): Promise<void> {
    this.ensureDir(type);
    const fp = entityPath(type, id);
    await pipeline(source, fs.createWriteStream(fp));
  }

  /** Stream read for large records */
  getStream(type: EntityType, id: string): Readable | null {
    const fp = entityPath(type, id);
    if (!fs.existsSync(fp)) return null;
    return fs.createReadStream(fp);
  }

  delete(type: EntityType, id: string): boolean {
    const fp = entityPath(type, id);
    if (!fs.existsSync(fp)) return false;
    fs.unlinkSync(fp);
    this.removeIndexEntry(type, id);
    return true;
  }

  search(type: EntityType, query: string): StorageRecord[] {
    const idx = this.loadIndex(type);
    const terms = query.toLowerCase().split(/[\s,._\-/]+/).filter(Boolean);
    if (terms.length === 0) return [];

    const scored = idx.entries
      .map((entry) => {
        let score = 0;
        for (const term of terms) {
          if (entry.id.toLowerCase().includes(term)) score += 3;
          for (const kw of entry.keywords) {
            if (kw.includes(term)) score += 1;
          }
        }
        return { id: entry.id, score };
      })
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored
      .slice(0, 50)
      .map((e) => this.get<StorageRecord>(type, e.id)!)
      .filter(Boolean);
  }

  /** Rebuild index for a given entity type */
  rebuildIndex(type: EntityType): number {
    const ids = this.list(type);
    const idx: StorageIndex = { entries: [], version: INDEX_VERSION };
    for (const id of ids) {
      const record = this.get<StorageRecord>(type, id);
      if (record) {
        idx.entries.push({
          id: record.id,
          updatedAt: record.updatedAt,
          keywords: extractKeywords(record),
        });
      }
    }
    this.indexes.set(type, idx);
    this.saveIndex(type);
    return idx.entries.length;
  }
}

export const storageService = new StorageService();
