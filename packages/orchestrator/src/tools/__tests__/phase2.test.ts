import { describe, it, expect } from 'vitest';
/**
 * Phase 2 integration tests (debate + plan-first)
 */
import { debateSubmitRuleBased } from '../debate/debate-submit.js';
import { debateRoundRuleBased } from '../debate/debate-round.js';
import { debateResolveRuleBased } from '../debate/debate-resolve.js';
import { classifyRuleBased } from '../plan-first/classify.js';
import { generatePlanRuleBased } from '../plan-first/generate.js';

describe('debate + plan-first integration', () => {
  it('classify → generate → debate flow', () => {
    const cls = classifyRuleBased({ task_description: 'Reproduce CFD paper results' });
    expect(cls.domain).toBeTruthy();

    const plan = generatePlanRuleBased({ task_description: 'CFD', classification: cls });
    expect(plan.plan_id).toMatch(/^plan_/);

    const debate = debateSubmitRuleBased({ plan: JSON.stringify(plan), task_description: 'CFD' });
    expect(debate.debate_id).toMatch(/^debate_/);

    const round = debateRoundRuleBased({ debate_id: debate.debate_id, role: 'proposer', argument: 'Good plan' });
    expect(round.scores).toBeDefined();

    const resolve = debateResolveRuleBased({ debate_id: debate.debate_id, rounds: [{ role: 'proposer', argument: 'Good plan', scores: { logical_coherence: 7, evidence_strength: 6, relevance: 8 } }, { role: 'critic', argument: 'Needs validation', scores: { logical_coherence: 6, evidence_strength: 7, relevance: 7 } }] });
    expect(resolve.final_plan).toBeTruthy();
  });
});
