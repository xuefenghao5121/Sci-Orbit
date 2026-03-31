/**
 * Knowledge base tools unit tests
 */
import { createKb, addEntry, searchEntries, updateEntry, exportKb } from '../knowledge/knowledge-store.js';

describe('kb_create → add → search → export flow', () => {
  it('should create, add, search, update, and export', () => {
    // create
    const kb = createKb('test-domain', 'physics', 'Test knowledge base');
    expect(kb.kb_id).toBeTruthy();
    expect(kb.domain).toBe('physics');

    // add
    const entry = addEntry(kb.kb_id, 'Navier-Stokes', 'The governing equations of fluid dynamics', ['fluid', 'PDE']);
    expect(entry.entry_id).toBeTruthy();
    expect(entry.title).toBe('Navier-Stokes');

    // add another
    addEntry(kb.kb_id, 'Reynolds Number', 'Dimensionless number for flow regime', ['fluid', 'dimensionless']);

    // search
    const results = searchEntries(kb.kb_id, 'fluid', 10);
    expect(results.length).toBeGreaterThanOrEqual(1);

    // update
    const updated = updateEntry(kb.kb_id, entry.entry_id, { content: 'Updated content' });
    expect(updated.content).toBe('Updated content');

    // export jsonl
    const jsonl = exportKb(kb.kb_id, 'jsonl');
    expect(jsonl).toContain('Navier-Stokes');

    // export csv
    const csv = exportKb(kb.kb_id, 'csv');
    expect(csv).toContain('entry_id,title,content');

    // export finetune
    const ft = exportKb(kb.kb_id, 'finetune');
    expect(ft).toBeTruthy();
  });
});

describe('kb edge cases', () => {
  it('should handle empty search', () => {
    const kb = createKb('empty-kb', 'test');
    const results = searchEntries(kb.kb_id, 'nonexistent');
    expect(results.length).toBe(0);
  });
});
