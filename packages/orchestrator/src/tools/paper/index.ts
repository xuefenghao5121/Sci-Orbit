export { paperParse } from './paper-parse.js';
export { paperCompare } from './paper-compare.js';
export { paperImplement } from './paper-implement.js';
export * from './schemas.js';
import { paperParse } from './paper-parse.js';
import { paperCompare } from './paper-compare.js';
import { paperImplement } from './paper-implement.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { PaperParseInput, PaperCompareInput, PaperImplementInput } from './schemas.js';

export const paperTools: MCPToolDefinition<unknown, unknown>[] = [
  { name: 'paper_parse', description: 'Parse a paper into structured information (title, authors, abstract, sections, findings, methods, formulas)', inputSchema: { type: 'object', properties: { content: { type: 'string', description: 'Paper text content' }, file_path: { type: 'string', description: 'Path to paper file' } }, required: [] }, handler: (i) => Promise.resolve(paperParse(i as PaperParseInput)) },
  { name: 'paper_compare', description: 'Compare multiple parsed papers and identify similarities, differences, and insights', inputSchema: { type: 'object', properties: { papers: { type: 'array', items: { type: 'object' }, description: 'Array of parsed papers' } }, required: ['papers'] }, handler: (i) => Promise.resolve(paperCompare(i as PaperCompareInput)) },
  { name: 'paper_implement', description: 'Generate code prototype from a parsed paper for a target framework', inputSchema: { type: 'object', properties: { paper: { type: 'object', description: 'Parsed paper' }, target_framework: { type: 'string', description: 'Target framework (pytorch, jax, numpy)' } }, required: ['paper', 'target_framework'] }, handler: (i) => Promise.resolve(paperImplement(i as PaperImplementInput)) },
];
