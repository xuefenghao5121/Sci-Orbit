import type { DebateRoundInput, DebateRoundOutput } from './schemas.js';
import { debateRoundOutput } from './schemas.js';

export function debateRoundRuleBased(input: DebateRoundInput): DebateRoundOutput {
  const arg = input.argument;
  const len = arg.length;
  const logical = len > 200 ? 8 : len > 100 ? 6 : 4;
  const evidence = /\d+\.?\d*%|benchmark|cite|reference|paper|study/i.test(arg) ? 8 : 5;
  const relevance = 7;
  const feedback = input.role === 'proposer'
    ? 'Proposer argument noted. Strengths in methodology approach.'
    : 'Critic perspective recorded. Valid concerns raised for consideration.';
  const mods = input.role === 'critic' && arg.length > 100
    ? ['Consider addressing the scalability concern', 'Add fallback strategy for edge cases']
    : [];
  return debateRoundOutput.parse({ scores: { logical_coherence: logical, evidence_strength: evidence, relevance }, feedback, suggested_modifications: mods });
}

export async function debateRoundWithLLM(input: DebateRoundInput): Promise<DebateRoundOutput> {
  const base = process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL || '';
  const key = process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '';
  const model = process.env.AI4S_LLM_MODEL || 'qwen-plus';
  try {
    const resp = await fetch(`${base}/compatible-mode/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: `Evaluate this debate round. Role: ${input.role}, Argument: ${input.argument}\nReturn JSON: {"scores":{"logical_coherence":0-10,"evidence_strength":0-10,"relevance":0-10},"feedback":"...","suggested_modifications":["..."]}` }], temperature: 0.2 }),
    });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const content = (await resp.json() as any).choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON');
    return debateRoundOutput.parse(JSON.parse(m[0]));
  } catch (e) {
    console.warn('[Debate] LLM round failed, fallback:', e);
    return debateRoundRuleBased(input);
  }
}

export async function debateRound(input: DebateRoundInput): Promise<DebateRoundOutput> {
  const hasLLM = !!(process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL) && !!(process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY);
  return hasLLM ? debateRoundWithLLM(input) : debateRoundRuleBased(input);
}
