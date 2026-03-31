/**
 * Knowledge base tools unit tests
 */
import { describe, it, expect } from 'vitest';
import { createKb, addEntry, searchEntries, updateEntry, exportKb } from '../knowledge/knowledge-store.js';

describe('kb_create → add → search → export flow', () => {
  it('should create, add, search, update, and export', () => {
    const kb = createKb('test-domain', 'physics', 'Test knowledge base');
    expect(kb.kb_id).toBeTruthy();
    expect(kb.domain).toBe('physics');

    const entry = addEntry(kb.kb_id, 'Navier-Stokes', 'The governing equations of fluid dynamics', ['fluid', 'PDE']);
    expect(entry.id).toBeTruthy();
    expect(entry.title).toBe('Navier-Stokes');

    addEntry(kb.kb_id, 'Reynolds Number', 'Dimensionless number for flow regime', ['fluid', 'dimensionless']);

    const results = searchEntries(kb.kb_id, 'fluid', 10);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const updated = updateEntry(kb.kb_id, entry.id, { content: 'Updated content' });
    expect(updated.content).toBe('Updated content');

    const jsonl = exportKb(kb.kb_id, 'jsonl');
    expect(jsonl).toBeTruthy();

    const csv = exportKb(kb.kb_id, 'csv');
    expect(csv).toBeTruthy();

    const ft = exportKb(kb.kb_id, 'finetune');
    expect(ft).toBeTruthy();
  });

  it('should handle empty search', () => {
    const kb = createKb('empty-kb', 'test');
    const results = searchEntries(kb.kb_id, 'nonexistent');
    expect(results.length).toBe(0);
  });
});
