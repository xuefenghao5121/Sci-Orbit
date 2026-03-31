/**
 * Debate tools unit tests
 */
import { describe, it, expect } from 'vitest';
import { debateSubmitRuleBased } from '../debate/debate-submit.js';
import { debateRoundRuleBased } from '../debate/debate-round.js';
import { debateResolveRuleBased } from '../debate/debate-resolve.js';

describe('debate_submit (rule-based)', () => {
  it('should return debate_id and initial_review', () => {
    const result = debateSubmitRuleBased({
      plan: 'Step 1: Define problem\n\nStep 2: Implement solver\n\nStep 3: Validate with benchmark',
      task_description: 'Simulate fluid dynamics',
    });
    expect(result.debate_id).toMatch(/^debate_/);
    expect(result.initial_review).toBeDefined();
    expect(result.initial_review.clarity).toBeGreaterThanOrEqual(0);
    expect(result.initial_review.clarity).toBeLessThanOrEqual(10);
    expect(result.initial_review.comments.length).toBeGreaterThan(0);
  });

  it('should score lower clarity for short plans', () => {
    const short = debateSubmitRuleBased({ plan: 'Do stuff', task_description: 'test' });
    const long = debateSubmitRuleBased({ plan: 'A'.repeat(200), task_description: 'test' });
    expect(long.initial_review.clarity).toBeGreaterThanOrEqual(short.initial_review.clarity);
  });

  it('should detect feasibility keywords', () => {
    const result = debateSubmitRuleBased({
      plan: 'Validate with realistic benchmark tests',
      task_description: 'test',
    });
    expect(result.initial_review.feasibility).toBeGreaterThanOrEqual(7);
  });
});

describe('debate_round (rule-based)', () => {
  it('should return scores and feedback', () => {
    const result = debateRoundRuleBased({
      debate_id: 'debate_1',
      role: 'proposer',
      argument: 'This approach is well-validated by existing literature',
    });
    expect(result.scores).toBeDefined();
    expect(result.scores.logical_coherence).toBeGreaterThanOrEqual(0);
    expect(result.feedback).toBeTruthy();
    expect(result.suggested_modifications).toBeInstanceOf(Array);
  });
});

describe('debate_resolve (rule-based)', () => {
  it('should return consensus plan', () => {
    const result = debateResolveRuleBased({
      debate_id: 'debate_1',
      rounds: [
        { role: 'proposer', argument: 'Good plan', scores: { logical_coherence: 7, evidence_strength: 6, relevance: 8 } },
        { role: 'critic', argument: 'Needs validation', scores: { logical_coherence: 6, evidence_strength: 7, relevance: 7 } },
      ],
    });
    expect(result.final_plan).toBeTruthy();
    expect(result.consensus_score).toBeGreaterThanOrEqual(0);
    expect(result.consensus_score).toBeLessThanOrEqual(1);
  });
});
