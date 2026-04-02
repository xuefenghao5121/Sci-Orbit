/**
 * Full integration tests — tests the tool functions end-to-end
 */
import { describe, it, expect } from 'vitest';
import { classifyRuleBased } from '../tools/plan-first/classify.js';
import { generatePlanRuleBased } from '../tools/plan-first/generate.js';
import { validatePlan } from '../tools/plan-first/validate.js';
import { reviewPlanRuleBased } from '../tools/plan-first/review.js';
import { debateSubmitRuleBased } from '../tools/debate/debate-submit.js';
import { debateRoundRuleBased } from '../tools/debate/debate-round.js';
import { debateResolveRuleBased } from '../tools/debate/debate-resolve.js';
import { createKb, addEntry, searchEntries, exportKb } from '../tools/knowledge/knowledge-store.js';
import { envDetect } from '../tools/env/env-detect.js';
import { checkDimension } from '../tools/constrain/dimension.js';

describe('Integration: classify → generate → validate → review', () => {
  it('completes full plan-first workflow', () => {
    const classification = classifyRuleBased({ task_description: 'Run CFD simulation with OpenFOAM' });
    expect(classification.domain).toBe('fluid_dynamics');

    const plan = generatePlanRuleBased({ task_description: 'CFD simulation', classification });
    expect(plan.plan_id).toMatch(/^plan_/);
    expect(plan.steps.length).toBeGreaterThan(0);

    const validation = validatePlan({ plan });
    expect(validation.valid).toBeDefined();
    expect(validation.score).toBeGreaterThanOrEqual(0);

    const review = reviewPlanRuleBased({ plan, task_description: 'CFD simulation' });
    expect(review.overall_score).toBeGreaterThanOrEqual(0);
    expect(review.overall_score).toBeLessThanOrEqual(10);
  });
});

describe('Integration: debate_submit → round → resolve', () => {
  it('completes full debate workflow', () => {
    const submit = debateSubmitRuleBased({
      plan: 'Step 1: Set up domain\n\nStep 2: Run simulation\n\nStep 3: Validate results with benchmark',
      task_description: 'CFD simulation',
    });
    expect(submit.debate_id).toMatch(/^debate_/);
    expect(submit.initial_review.clarity).toBeGreaterThanOrEqual(0);

    const round1 = debateRoundRuleBased({
      debate_id: submit.debate_id,
      role: 'proposer',
      argument: 'This plan is well-structured and follows standard CFD workflow',
    });
    expect(round1.scores).toBeDefined();

    const round2 = debateRoundRuleBased({
      debate_id: submit.debate_id,
      role: 'critic',
      argument: 'Need more detail on validation methodology',
    });
    expect(round2.scores).toBeDefined();

    const resolve = debateResolveRuleBased({
      debate_id: submit.debate_id,
      rounds: [
        { role: 'proposer', argument: 'Good plan', scores: round1.scores },
        { role: 'critic', argument: 'Needs work', scores: round2.scores },
      ],
    });
    expect(resolve.final_plan).toBeTruthy();
    expect(resolve.consensus_score).toBeGreaterThanOrEqual(0);
  });
});

describe('Integration: kb_create → add → search → export', () => {
  it('completes full knowledge base workflow', () => {
    const kb = createKb('physics-kb', 'physics', 'Physics knowledge base');
    expect(kb.kb_id).toBeTruthy();

    addEntry(kb.kb_id, 'Quantum Mechanics', 'Study of subatomic particles', ['quantum', 'physics']);
    addEntry(kb.kb_id, 'General Relativity', 'Theory of gravity', ['relativity', 'physics']);
    addEntry(kb.kb_id, 'Statistical Mechanics', 'Thermodynamics and entropy', ['thermo', 'physics']);

    const results = searchEntries(kb.kb_id, 'quantum');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].entry.title).toBe('Quantum Mechanics');

    const exported = exportKb(kb.kb_id, 'jsonl');
    expect(exported).toContain('Quantum Mechanics');
  });
});

describe('Integration: env_detect → validate output', () => {
  it('returns valid environment info', () => {
    const env = envDetect();
    expect(env.os).toBeTruthy();
    expect(typeof env.cpu).toBe('string');
    expect(typeof env.ram_gb).toBe('number');
    expect(Array.isArray(env.gpu)).toBe(true);
  });
});

describe('Integration: check_dimension', () => {
  it('validates dimensional consistency', async () => {
    const result = await checkDimension({
      equation: 'F = m * a',
      variables: { F: 'N', m: 'kg', a: 'm/s^2' },
    });
    expect(result.is_consistent).toBe(true);
  });

  it('detects missing variables', async () => {
    const result = await checkDimension({
      equation: 'E = m * c^2',
      variables: { E: 'J', m: 'kg' },
    });
    expect(result.is_consistent).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('Integration: all tool modules are importable', () => {
  it('tools index exports all tool arrays', async () => {
    const { planFirstTools } = await import('../tools/plan-first/index.js');
    const { debateTools } = await import('../tools/debate/index.js');
    const { paperTools } = await import('../tools/paper/index.js');
    const { experimentTools } = await import('../tools/experiment/index.js');
    const { envTools } = await import('../tools/env/index.js');
    const { knowledgeTools } = await import('../tools/knowledge/index.js');
    const { finetuneTools } = await import('../tools/finetune/index.js');
    const { scienceTools } = await import('../tools/science/index.js');
    const { deployTools } = await import('../tools/deploy/index.js');
    const { constrainTools } = await import('../tools/constrain/index.js');

    expect(planFirstTools.length).toBe(4);
    expect(debateTools.length).toBe(3);
    expect(paperTools.length).toBe(3);
    expect(experimentTools.length).toBe(4);
    expect(envTools.length).toBe(4);
    expect(knowledgeTools.length).toBe(5);
    expect(finetuneTools.length).toBe(6);
    expect(scienceTools.length).toBe(4);
    expect(deployTools.length).toBe(3);
    expect(constrainTools.length).toBe(4);

    const total = planFirstTools.length + debateTools.length + paperTools.length +
      experimentTools.length + envTools.length + knowledgeTools.length +
      finetuneTools.length + scienceTools.length + deployTools.length + constrainTools.length;
    expect(total).toBe(40);
  });
});
