import fs from "node:fs";
import path from "node:path";
import { storageService, StorageRecord } from "./storage.js";
import { configService } from "./config.js";

export interface KnowledgeEntry extends StorageRecord {
  id: string;
  domain: string;
  title: string;
  content: string;
  keywords: string[];
  source?: string;
  tags?: string[];
}

export type ExportFormat = "alpaca" | "sharegpt";

export class KnowledgeManagerService {
  create(domain: string, title: string, content: string, keywords: string[] = [], source?: string): KnowledgeEntry {
    const id = `kb_${domain}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entry: KnowledgeEntry = {
      id,
      domain,
      title,
      content,
      keywords,
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storageService.put("knowledge", entry);
    return entry;
  }

  get(id: string): KnowledgeEntry | null {
    return storageService.get<KnowledgeEntry>("knowledge", id);
  }

  update(id: string, updates: Partial<Pick<KnowledgeEntry, "title" | "content" | "keywords" | "tags">>): KnowledgeEntry | null {
    const entry = storageService.get<KnowledgeEntry>("knowledge", id);
    if (!entry) return null;
    Object.assign(entry, updates, { updatedAt: new Date().toISOString() });
    storageService.put("knowledge", entry);
    return entry;
  }

  delete(id: string): boolean {
    return storageService.delete("knowledge", id);
  }

  list(domain?: string): string[] {
    const all = storageService.list("knowledge");
    if (!domain) return all;
    return all.filter((id) => id.startsWith(`kb_${domain}_`));
  }

  search(query: string): KnowledgeEntry[] {
    return storageService.search("knowledge", query) as KnowledgeEntry[];
  }

  searchByDomain(domain: string): KnowledgeEntry[] {
    return this.list(domain).map((id) => storageService.get<KnowledgeEntry>("knowledge", id)!).filter(Boolean);
  }

  export(format: ExportFormat, entries?: KnowledgeEntry[]): string {
    const items = entries || storageService.list("knowledge").map((id) => storageService.get<KnowledgeEntry>("knowledge", id)!).filter(Boolean);
    const lines: string[] = [];

    for (const entry of items) {
      if (format === "alpaca") {
        lines.push(JSON.stringify({
          instruction: entry.title,
          input: entry.content.slice(0, 500),
          output: entry.content,
        }));
      } else {
        // ShareGPT
        lines.push(JSON.stringify({
          conversations: [
            { from: "human", value: entry.title },
            { from: "gpt", value: entry.content },
          ],
        }));
      }
    }

    return lines.join("\n");
  }

  exportToFile(format: ExportFormat, filePath?: string): string {
    const base = configService.get("storage").basePath;
    const defaultPath = path.join(base, "exports", `knowledge_${Date.now()}.${format}.jsonl`);
    const outPath = filePath || defaultPath;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, this.export(format), "utf-8");
    return outPath;
  }
}

export const knowledgeManager = new KnowledgeManagerService();
