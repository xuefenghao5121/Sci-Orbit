import { z } from 'zod';

export const kbCreateInput = z.object({
  name: z.string().describe('Knowledge base name'),
  domain: z.string().describe('Domain description'),
  description: z.string().optional(),
});
export const kbCreateOutput = z.object({
  kb_id: z.string(),
  name: z.string(),
  domain: z.string(),
  entry_count: z.number(),
  created_at: z.string(),
});
export type KbCreateInput = z.infer<typeof kbCreateInput>;
export type KbCreateOutput = z.infer<typeof kbCreateOutput>;

export const kbEntry = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  source: z.string().optional(),
  created_at: z.string(),
});

export const kbAddInput = z.object({
  kb_id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
});
export const kbAddOutput = kbEntry;
export type KbAddInput = z.infer<typeof kbAddInput>;
export type KbAddOutput = z.infer<typeof kbAddOutput>;

export const kbSearchInput = z.object({
  kb_id: z.string(),
  query: z.string(),
  limit: z.number().optional().default(5),
});
export const kbSearchOutput = z.object({
  results: z.array(z.object({ entry: kbEntry, score: z.number() })),
  total: z.number(),
});
export type KbSearchInput = z.infer<typeof kbSearchInput>;
export type KbSearchOutput = z.infer<typeof kbSearchOutput>;

export const kbUpdateInput = z.object({
  kb_id: z.string(),
  entry_id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export const kbUpdateOutput = kbEntry;
export type KbUpdateInput = z.infer<typeof kbUpdateInput>;
export type KbUpdateOutput = z.infer<typeof kbUpdateOutput>;

export const kbExportInput = z.object({
  kb_id: z.string(),
  format: z.enum(['jsonl', 'csv', 'finetune']).default('jsonl'),
});
export const kbExportOutput = z.object({
  data: z.string(),
  format: z.string(),
  entry_count: z.number(),
});
export type KbExportInput = z.infer<typeof kbExportInput>;
export type KbExportOutput = z.infer<typeof kbExportOutput>;
