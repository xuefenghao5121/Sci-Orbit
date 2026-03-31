/**
 * Paper tools unit tests
 */
import { describe, it, expect } from 'vitest';
import { paperParse } from '../paper/paper-parse.js';
import { paperCompare } from '../paper/paper-compare.js';
import { paperImplement } from '../paper/paper-implement.js';

describe('paper_parse', () => {
  it('should parse paper content', () => {
    const result = paperParse({
      content: '# Title\n\nAuthor: John\n\n## Abstract\nThis is a test abstract.',
    });
    expect(result.title).toBeTruthy();
  });
});

describe('paper_compare', () => {
  it('should compare two papers', () => {
    const papers = [
      { title: 'Paper A', authors: ['Alice'], abstract: 'About ML', methods: ['neural net'], key_findings: ['good'] },
      { title: 'Paper B', authors: ['Bob'], abstract: 'About physics', methods: ['simulation'], key_findings: ['accurate'] },
    ];
    const result = paperCompare({ papers });
    expect(result).toBeDefined();
  });
});

describe('paper_implement', () => {
  it('should generate code prototype', () => {
    const result = paperImplement({
      paper: { title: 'Test', authors: [], abstract: 'Test abstract', methods: ['numpy'], findings: [] },
      target_framework: 'pytorch',
    });
    expect(result).toBeDefined();
  });
});
