import type { DebateSubmitInput, DebateSubmitOutput } from './schemas.js';
import { debateSubmitOutput } from './schemas.js';

const genId = () => `debate_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function debateSubmitRuleBased(input: DebateSubmitInput): DebateSubmitOutput {
  const plan = input.plan;
  const clarity = plan.length > 100 ? 8 : plan.length > 50 ? 6 : 4;
  const sections = plan.split(/\n\n+/).filter(s => s.trim());
  const completeness = Math.min(10, sections.length * 2);
  const feasibility = /realistic|feasible|benchmark|validate|test/i.test(plan) ? 8 : 5;
  const comments: string[] = [];
  if (clarity < 7) comments.push('Plan could be more clearly structured with numbered steps');
  if (completeness < 6) comments.push('Plan lacks sufficient detail — add specific steps and expected outcomes');
  if (feasibility < 7) comments.push('Consider adding feasibility validation or benchmark comparisons');
  if (comments.length === 0) comments.push('Plan appears well-structured for debate');
  return debateSubmitOutput.parse({ debate_id: genId(), initial_review: { clarity, feasibility, completeness, comments } });
}

export async function debateSubmitWithLLM(input: DebateSubmitInput): Promise<DebateSubmitOutput> {
  const base = process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL || '';
  const key = process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  const model = process.env.AI4S_LLM_MODEL || 'qwen-plus';
  try {
    const resp = await fetch(`${base}/compatible-mode/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: `Review this plan for a debate. Task: ${input.task_description}\nPlan: ${input.plan}\nReturn JSON: {"debate_id":"xxx","initial_review":{"clarity":0-10,"feasibility":0-10,"completeness":0-10,"comments":["..."]}}` }], temperature: 0.2 }),
    });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const content = (await resp.json() as any).choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON');
    return debateSubmitOutput.parse(JSON.parse(m[0]));
  } catch (e) {
    console.warn('[Debate] LLM failed, fallback:', e);
    return debateSubmitRuleBased(input);
  }
}

export function hasLLMConfig() { return !!(process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL) && !!(process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY); }

export async function debateSubmit(input: DebateSubmitInput): Promise<DebateSubmitOutput> {
  return hasLLMConfig() ? debateSubmitWithLLM(input) : debateSubmitRuleBased(input);
}
