import { describe, it, expect, afterAll } from 'vitest';
/**
 * Storage service tests
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ai4s-storage-'));
process.env.HOME = TEST_DIR;
fs.mkdirSync(path.join(TEST_DIR, '.claude', 'ai4s'), { recursive: true });

const { StorageService } = await import('../../services/storage.js');

describe('StorageService', () => {
  it('returns empty list for new storage', () => {
    const svc = new StorageService();
    expect(svc.list('papers')).toEqual([]);
  });

  it('stores and retrieves records', () => {
    const svc = new StorageService();
    svc.put('papers', { id: 'test1', createdAt: '', updatedAt: '', title: 'Test Paper' } as any);
    const record = svc.get('papers', 'test1');
    expect(record).toBeDefined();
    expect(record!.title).toBe('Test Paper');
  });

  it('deletes records', () => {
    const svc = new StorageService();
    svc.put('papers', { id: 'del1', createdAt: '', updatedAt: '' } as any);
    expect(svc.delete('papers', 'del1')).toBe(true);
    expect(svc.delete('papers', 'del1')).toBe(false);
  });

  it('searches records', () => {
    const svc = new StorageService();
    svc.put('papers', { id: 's1', createdAt: '', updatedAt: '', title: 'Machine Learning Basics' } as any);
    svc.put('papers', { id: 's2', createdAt: '', updatedAt: '', title: 'Deep Learning Advanced' } as any);
    const results = svc.search('papers', 'Learning');
    expect(results.length).toBe(2);
  });

  afterAll(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
