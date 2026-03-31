import type { PaperCompareInput, PaperCompareOutput } from './schemas.js';
import { paperCompareOutput } from './schemas.js';

function jaccard<T>(a: T[], b: T[]): number {
  const set = new Set([...a, ...b]);
  let inter = 0;
  for (const x of set) if (a.includes(x) && b.includes(x)) inter++;
  return set.size === 0 ? 0 : inter / set.size;
}

export function paperCompare(input: PaperCompareInput): PaperCompareOutput {
  const papers = input.papers;
  if (papers.length < 2) throw new Error('Need at least 2 papers to compare');

  const rows: Record<string, string>[] = papers.map(p => ({ Title: p.title, Authors: p.authors.join(', '), Findings: p.key_findings.join('; ').slice(0, 100), Methods: p.methods.join('; ').slice(0, 100) }));

  const similarities: string[] = [];
  const differences: string[] = [];
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const sim = jaccard(papers[i].methods, papers[j].methods);
      if (sim > 0.3) similarities.push(`${papers[i].title} & ${papers[j].title}: Similar methods (Jaccard: ${sim.toFixed(2)})`);
      if (papers[i].methods.length !== papers[j].methods.length) differences.push(`${papers[i].title} uses ${papers[i].methods.length} methods vs ${papers[j].title} uses ${papers[j].methods.length}`);
    }
  }
  if (similarities.length === 0) similarities.push('Papers appear to address different aspects of the problem');
  if (differences.length === 0) differences.push('Papers share similar scope and methodology');

  const insights = papers.length > 2 ? ['Multiple papers suggest convergence in the field', 'Cross-paper synthesis may yield stronger results'] : ['Direct comparison reveals complementary strengths'];

  return paperCompareOutput.parse({ comparison_table: rows, similarities, differences, insights });
}
