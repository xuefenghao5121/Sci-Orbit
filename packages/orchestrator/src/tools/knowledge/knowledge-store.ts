import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const STORE_DIR = join(process.cwd(), '.ai4s_kb');

export interface KbEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string;
  created_at: string;
}

export interface KnowledgeBase {
  kb_id: string;
  name: string;
  domain: string;
  description?: string;
  entries: KbEntry[];
  created_at: string;
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function filePath(kbId: string) { return join(STORE_DIR, `${kbId}.json`); }

export function loadKb(kbId: string): KnowledgeBase | null {
  const fp = filePath(kbId);
  if (!existsSync(fp)) return null;
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

export function saveKb(kb: KnowledgeBase): void {
  mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(filePath(kb.kb_id), JSON.stringify(kb, null, 2));
}

export function createKb(name: string, domain: string, description?: string): KnowledgeBase {
  const kb: KnowledgeBase = { kb_id: `kb_${genId()}`, name, domain, description, entries: [], created_at: new Date().toISOString() };
  saveKb(kb);
  return kb;
}

export function addEntry(kbId: string, title: string, content: string, tags: string[] = [], source?: string): KbEntry {
  let kb = loadKb(kbId);
  if (!kb) throw new Error(`Knowledge base ${kbId} not found`);
  const entry: KbEntry = { id: `entry_${genId()}`, title, content, tags, source, created_at: new Date().toISOString() };
  kb.entries.push(entry);
  saveKb(kb);
  return entry;
}

export function searchEntries(kbId: string, query: string, limit = 5): { entry: KbEntry; score: number }[] {
  const kb = loadKb(kbId);
  if (!kb) return [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  return kb.entries.map(entry => {
    const text = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
    const score = queryWords.filter(w => text.includes(w)).length / queryWords.length;
    return { entry, score };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function updateEntry(kbId: string, entryId: string, updates: Partial<Pick<KbEntry, 'title' | 'content' | 'tags'>>): KbEntry {
  const kb = loadKb(kbId);
  if (!kb) throw new Error(`Knowledge base ${kbId} not found`);
  const idx = kb.entries.findIndex(e => e.id === entryId);
  if (idx === -1) throw new Error(`Entry ${entryId} not found`);
  Object.assign(kb.entries[idx], updates);
  saveKb(kb);
  return kb.entries[idx];
}

export function exportKb(kbId: string, format: 'jsonl' | 'csv' | 'finetune' = 'jsonl'): string {
  const kb = loadKb(kbId);
  if (!kb) throw new Error(`Knowledge base ${kbId} not found`);
  if (format === 'jsonl') return kb.entries.map(e => JSON.stringify(e)).join('\n');
  if (format === 'csv') {
    const header = 'id,title,content,tags,source,created_at';
    const rows = kb.entries.map(e => [e.id, e.title, `"${e.content.replace(/"/g, '""')}"`, e.tags.join(';'), e.source || '', e.created_at].join(','));
    return [header, ...rows].join('\n');
  }
  // finetune format: instruction/input/output
  return kb.entries.map(e => JSON.stringify({ instruction: e.title, input: '', output: e.content })).join('\n');
}
