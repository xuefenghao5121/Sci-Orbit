import { z } from 'zod';

export const paperParseInput = z.object({
  content: z.string().optional().describe('Paper text content'),
  file_path: z.string().optional().describe('Path to paper file'),
});
export const paperParseOutput = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  abstract: z.string(),
  sections: z.array(z.object({ heading: z.string(), content: z.string() })),
  key_findings: z.array(z.string()),
  methods: z.array(z.string()),
  formulas: z.array(z.string()),
});
export type PaperParseInput = z.infer<typeof paperParseInput>;
export type PaperParseOutput = z.infer<typeof paperParseOutput>;

export const paperCompareInput = z.object({
  papers: z.array(paperParseOutput),
});
export const paperCompareOutput = z.object({
  comparison_table: z.array(z.record(z.string(), z.string())),
  similarities: z.array(z.string()),
  differences: z.array(z.string()),
  insights: z.array(z.string()),
});
export type PaperCompareInput = z.infer<typeof paperCompareInput>;
export type PaperCompareOutput = z.infer<typeof paperCompareOutput>;

export const paperImplementInput = z.object({
  paper: paperParseOutput,
  target_framework: z.string().describe('Target framework (e.g. pytorch, jax, numpy)'),
});
export const paperImplementOutput = z.object({
  code_structure: z.array(z.object({ file: z.string(), description: z.string() })),
  implementation_plan: z.array(z.string()),
  starter_code: z.string(),
});
export type PaperImplementInput = z.infer<typeof paperImplementInput>;
export type PaperImplementOutput = z.infer<typeof paperImplementOutput>;
