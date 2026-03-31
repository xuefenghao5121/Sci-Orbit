import { z } from 'zod';

export const debateSubmitInput = z.object({
  plan: z.string().describe('The plan to debate'),
  task_description: z.string().describe('Original task description'),
});
export const debateSubmitOutput = z.object({
  debate_id: z.string(),
  initial_review: z.object({
    clarity: z.number().min(0).max(10),
    feasibility: z.number().min(0).max(10),
    completeness: z.number().min(0).max(10),
    comments: z.array(z.string()),
  }),
});
export type DebateSubmitInput = z.infer<typeof debateSubmitInput>;
export type DebateSubmitOutput = z.infer<typeof debateSubmitOutput>;

export const DebateRole = z.enum(['proposer', 'critic']);
export const debateRoundInput = z.object({
  debate_id: z.string(),
  role: DebateRole,
  argument: z.string(),
});
export const debateRoundOutput = z.object({
  scores: z.object({
    logical_coherence: z.number().min(0).max(10),
    evidence_strength: z.number().min(0).max(10),
    relevance: z.number().min(0).max(10),
  }),
  feedback: z.string(),
  suggested_modifications: z.array(z.string()),
});
export type DebateRoundInput = z.infer<typeof debateRoundInput>;
export type DebateRoundOutput = z.infer<typeof debateRoundOutput>;

export const debateResolveInput = z.object({
  debate_id: z.string(),
  rounds: z.array(z.object({
    role: DebateRole,
    argument: z.string(),
    scores: z.object({
      logical_coherence: z.number(),
      evidence_strength: z.number(),
    }),
  })),
});
export const debateResolveOutput = z.object({
  final_plan: z.string(),
  consensus_score: z.number().min(0).max(1),
  modifications: z.array(z.string()),
});
export type DebateResolveInput = z.infer<typeof debateResolveInput>;
export type DebateResolveOutput = z.infer<typeof debateResolveOutput>;
