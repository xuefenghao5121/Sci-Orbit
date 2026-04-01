/**
 * LLM-based classifier with fallback
 */
import type { ClassifyTaskInput, ClassifyTaskOutput } from './schemas.js';
import { classifyTaskOutput } from './schemas.js';
import { classifyRuleBased } from './classify.js';
import { logger } from '../../utils/logger.js';

const LLM_BASE_URL = process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL || '';
const LLM_API_KEY = process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '';
const LLM_MODEL = process.env.AI4S_LLM_MODEL || 'qwen-plus';

// LLM API response types
interface LLMMessage {
  role: string;
  content: string;
}

interface LLMChoice {
  index: number;
  message: LLMMessage;
  finish_reason: string;
}

interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function hasLLMConfig(): boolean {
  return !!(LLM_BASE_URL && LLM_API_KEY);
}

export async function classifyWithLLM(input: ClassifyTaskInput): Promise<ClassifyTaskOutput> {
  const prompt = `Classify this scientific task. Return ONLY valid JSON.
Task: ${input.task_description}
Return: {"domain":"fluid_dynamics|materials_science|molecular_dynamics|quantum_chemistry|bioinformatics|astronomy|earth_science|general","task_type":"paper_reproduction|new_method|data_analysis|visualization|modeling|optimization|other","complexity":"simple|medium|complex","approach":"numerical_simulation|machine_learning|symbolic_computation|hybrid","estimated_duration":"hours|days|weeks","dependencies":[],"confidence":0.8,"reasoning":"..."}`;

  try {
    const resp = await fetch(`${LLM_BASE_URL}/compatible-mode/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({ model: LLM_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
    });
    if (!resp.ok) throw new Error(`LLM ${resp.status}`);
    const data = (await resp.json()) as LLMResponse;
    const content = data.choices?.[0]?.message?.content || '';
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON');
    return classifyTaskOutput.parse(JSON.parse(m[0]));
  } catch (e) {
    logger.info(`[Plan-First] LLM failed, using rule-based fallback: ${(e as Error).message}`);
    return classifyRuleBased(input);
  }
}

export async function classifyTask(input: ClassifyTaskInput): Promise<ClassifyTaskOutput> {
  return hasLLMConfig() ? classifyWithLLM(input) : classifyRuleBased(input);
}
