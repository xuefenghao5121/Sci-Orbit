import { readFileSync } from 'fs';
import type { PaperParseInput, PaperParseOutput } from './schemas.js';
import { paperParseOutput } from './schemas.js';

export function paperParse(input: PaperParseInput): PaperParseOutput {
  let text = input.content || '';
  if (!text && input.file_path) {
    text = readFileSync(input.file_path, 'utf-8');
  }
  if (!text) throw new Error('Provide either content or file_path');

  // Extract title (first non-empty line or after "Title:")
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] || 'Untitled Paper';

  // Extract authors (lines with @ or "Author" keyword)
  const authors = lines.filter(l => /author|@|\d{4}/i.test(l) && l.length < 200).slice(0, 5);
  const authorNames = authors.length > 0 ? authors : ['Unknown'];

  // Extract abstract
  const absMatch = text.match(/abstract[\s:]*\n?([\s\S]*?)(?=\n\s*\n|introduction|1\s*\.)?/i);
  const abstract = absMatch ? absMatch[1].trim().slice(0, 500) : lines.slice(1, 5).join(' ').slice(0, 500);

  // Split into sections
  const sectionRegex = /^(#{1,3}\s+|\d+\.\s+)(.+)$/gm;
  const sectionHeadings: { heading: string; content: string }[] = [];
  let match;
  const sectionPositions: { pos: number; heading: string }[] = [];
  while ((match = sectionRegex.exec(text)) !== null) {
    sectionPositions.push({ pos: match.index, heading: match[2].trim() });
  }
  if (sectionPositions.length === 0) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    sectionHeadings.push({ heading: 'Content', content: paragraphs.join('\n\n').slice(0, 2000) });
  } else {
    for (let i = 0; i < sectionPositions.length; i++) {
      const start = sectionPositions[i].pos;
      const end = i + 1 < sectionPositions.length ? sectionPositions[i + 1].pos : text.length;
      sectionHeadings.push({ heading: sectionPositions[i].heading, content: text.slice(start, end).trim().slice(0, 1000) });
    }
  }

  // Key findings: sentences with "we show", "we find", "results indicate", etc.
  const findingPatterns = /(?:we (?:show|find|demonstrate|propose|present)|results? (?:show|indicate|suggest|demonstrate)|our (?:method|approach)|significantly|improv\w+ by)/gi;
  const findings: string[] = [];
  const sentences = text.split(/[.!?]+/);
  for (const s of sentences) {
    if (findingPatterns.test(s) && s.trim().length > 20 && findings.length < 5) {
      findings.push(s.trim());
      findingPatterns.lastIndex = 0;
    }
    findingPatterns.lastIndex = 0;
  }

  // Methods: sentences with method-related keywords
  const methodPatterns = /(?:we use|we employ|we adopt|using|trained with|architecture|layer|module|loss function|optimizer)/gi;
  const methods: string[] = [];
  for (const s of sentences) {
    if (methodPatterns.test(s) && s.trim().length > 20 && methods.length < 5) {
      methods.push(s.trim());
      methodPatterns.lastIndex = 0;
    }
    methodPatterns.lastIndex = 0;
  }

  // Formulas: lines with math-like content
  const formulaLines = lines.filter(l => /[=<>±∑∏∫∂√αβγδεθλμσφψωΩ→∞±×÷]/.test(l) && l.length < 200);
  const formulas = formulaLines.slice(0, 5);

  return paperParseOutput.parse({ title, authors: authorNames, abstract, sections: sectionHeadings, key_findings: findings, methods, formulas });
}
