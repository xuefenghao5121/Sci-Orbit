/**
 * review_plan — scientific rationality review
 */

import type { ReviewPlanInput, ReviewPlanOutput } from './schemas.js';
import { reviewPlanOutput } from './schemas.js';
import { hasLLMConfig } from './classify-llm.js';

// ─── Rule-based review ──────────────────────────────────────────────────────

function scoreFromComments(comments: string[]): number {
  if (comments.length === 0) return 10;
  const issues = comments.filter(c => !c.startsWith('[OK]')).length;
  return Math.max(0, 10 - issues * 2);
}

export function reviewPlanRuleBased(input: ReviewPlanInput): ReviewPlanOutput {
  const plan = input.plan as Record<string, unknown>;
  const classification = (plan.classification || {}) as Record<string, unknown>;

  // Method rationality
  const methodComments: string[] = [];
  const approach = String(classification.approach || '');
  const domain = String(classification.domain || '');
  if (approach === 'machine_learning' && ['quantum_chemistry', 'molecular_dynamics'].includes(domain)) {
    methodComments.push('Pure ML approach for quantum/molecular domain may lack physical interpretability — consider hybrid');
  }
  if (approach === 'symbolic_computation' && classification.complexity === 'complex') {
    methodComments.push('Symbolic computation on complex problems may face performance bottlenecks');
  }
  if (methodComments.length === 0) methodComments.push('[OK] Method selection appears reasonable for the domain');

  // Physical constraints
  const physicsComments: string[] = [];
  const steps = (plan.steps || []) as { tasks?: { task: string }[] }[];
  const allTasks = steps.flatMap(s => s.tasks || []).map(t => t.task.toLowerCase());
  if (['fluid_dynamics', 'molecular_dynamics', 'quantum_chemistry', 'materials_science'].includes(domain)) {
    if (!allTasks.some(t => t.includes('bound') || t.includes('constraint') || t.includes('periodic'))) {
      physicsComments.push('Physical boundary/constraint conditions not explicitly mentioned — verify they are handled');
    }
  }
  if (physicsComments.length === 0) physicsComments.push('[OK] Physical constraints appear to be addressed');

  // Dimensional consistency
  const dimComments: string[] = [];
  dimComments.push('[OK] Dimensional analysis recommended during implementation phase');

  // Validation criteria
  const valComments: string[] = [];
  const criteria = (plan.success_criteria || []) as string[];
  if (criteria.length < 2) valComments.push('Insufficient success criteria — add quantitative thresholds');
  if (!criteria.some(c => /benchmark|analytical|convergence|error/i.test(c))) {
    valComments.push('Consider adding benchmark or convergence-based validation');
  }
  if (valComments.length === 0) valComments.push('[OK] Validation criteria are comprehensive');

  const methodScore = scoreFromComments(methodComments);
  const physicsScore = scoreFromComments(physicsComments);
  const dimScore = scoreFromComments(dimComments);
  const valScore = scoreFromComments(valComments);
  const overall = Math.round((methodScore + physicsScore + dimScore + valScore) / 4 * 10) / 10;

  const suggestions: string[] = [];
  if (overall < 7) suggestions.push('Consider consulting domain literature for method validation strategies');
  if (domain !== 'general') suggestions.push(`Add domain-specific benchmarks from ${domain.replace('_', ' ')} literature`);
  suggestions.push('Include unit tests for each computational module');

  return reviewPlanOutput.parse({
    overall_score: overall,
    method_rationality: { score: methodScore, comments: methodComments },
    physical_constraints: { score: physicsScore, comments: physicsComments },
    dimensional_consistency: { score: dimScore, comments: dimComments },
    validation_criteria: { score: valScore, comments: valComments },
    suggestions,
  });
}

// ─── LLM-based review ───────────────────────────────────────────────────────

export async function reviewPlanWithLLM(input: ReviewPlanInput): Promise<ReviewPlanOutput> {
  const prompt = `You are a senior scientific computing reviewer. Review this plan and return JSON.

Plan: ${JSON.stringify(input.plan, null, 2)}

Return JSON:
{
  "overall_score": 0-10,
  "method_rationality": {"score": 0-10, "comments": ["..."]},
  "physical_constraints": {"score": 0-10, "comments": ["..."]},
  "dimensional_consistency": {"score": 0-10, "comments": ["..."]},
  "validation_criteria": {"score": 0-10, "comments": ["..."]},
  "suggestions": ["..."]
}`;

  try {
    const base = process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL || '';
    const key = process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    const model = process.env.AI4S_LLM_MODEL || 'qwen-plus';

    const resp = await fetch(`${base}/compatible-mode/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
    });
    if (!resp.ok) throw new Error(`LLM API ${resp.status}`);
    const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');
    return reviewPlanOutput.parse(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.warn('[Plan-First] LLM review failed, falling back to rules:', err);
    return reviewPlanRuleBased(input);
  }
}

export async function reviewPlan(input: ReviewPlanInput): Promise<ReviewPlanOutput> {
  if (hasLLMConfig()) return reviewPlanWithLLM(input);
  return reviewPlanRuleBased(input);
}
