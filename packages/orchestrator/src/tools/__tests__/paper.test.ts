/**
 * Paper tools unit tests
 */
import { paperParse } from '../paper/paper-parse.js';
import { paperCompare } from '../paper/paper-compare.js';
import { paperImplement } from '../paper/paper-implement.js';

describe('paper_parse', () => {
  it('should parse paper content', () => {
    const result = paperParse({
      content: '# Title\n\nAuthor: John\n\n## Abstract\nThis is a test abstract.',
    });
    expect(result.title).toBe('Title');
    expect(result.authors).toBeDefined();
    expect(result.abstract).toBeTruthy();
  });

  it('should handle file_path fallback', () => {
    const result = paperParse({ content: 'Some content' });
    expect(result).toBeDefined();
    expect(result.title).toBeTruthy();
  });
});

describe('paper_compare', () => {
  it('should compare two papers', () => {
    const papers = [
      { title: 'Paper A', authors: ['Alice'], abstract: 'About ML', methods: ['neural net'], findings: ['good'] },
      { title: 'Paper B', authors: ['Bob'], abstract: 'About physics', methods: ['simulation'], findings: ['accurate'] },
    ];
    const result = paperCompare({ papers });
    expect(result.similarities).toBeDefined();
    expect(result.differences).toBeDefined();
  });
});

describe('paper_implement', () => {
  it('should generate code prototype', () => {
    const result = paperImplement({
      paper: { title: 'Test', authors: [], abstract: 'Test abstract', methods: ['numpy'], findings: [] },
      target_framework: 'pytorch',
    });
    expect(result.code).toBeTruthy();
    expect(result.files).toBeDefined();
  });
});
