/**
 * generate_plan — structured analysis plan
 */
import type { GeneratePlanInput, GeneratePlanOutput } from './schemas.js';
import { generatePlanOutput, classifyTaskOutput } from './schemas.js';
import { hasLLMConfig } from './classify-llm.js';

function genId() { return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`; }

const TEMPLATES: Record<string, { phases: { phase: 'Problem Analysis' | 'Method Selection' | 'Implementation' | 'Validation'; tasks: { task: string; description: string; tools: string[]; estimated_time: string }[] }[]; deps: string[] }> = {
  fluid_dynamics: {
    phases: [
      { phase: 'Problem Analysis', tasks: [
        { task: 'Define governing equations', description: 'Identify Navier-Stokes or other PDEs', tools: ['numpy'], estimated_time: '2h' },
        { task: 'Specify boundary/initial conditions', description: 'Define domain geometry and conditions', tools: [], estimated_time: '1h' },
      ]},
      { phase: 'Method Selection', tasks: [
        { task: 'Select discretization scheme', description: 'FVM/FEM/FDM', tools: [], estimated_time: '2h' },
        { task: 'Choose time integration', description: 'Explicit/implicit stability analysis', tools: [], estimated_time: '1h' },
      ]},
      { phase: 'Implementation', tasks: [
        { task: 'Implement mesh/grid generation', description: 'Structured or unstructured grid', tools: ['numpy', 'scipy'], estimated_time: '1d' },
        { task: 'Implement solver', description: 'Linear system + time stepping', tools: ['numpy', 'scipy'], estimated_time: '2d' },
        { task: 'Add post-processing', description: 'Visualization and data export', tools: ['matplotlib'], estimated_time: '4h' },
      ]},
      { phase: 'Validation', tasks: [
        { task: 'Grid convergence study', description: 'Refine mesh and compare', tools: ['numpy'], estimated_time: '4h' },
        { task: 'Compare with benchmark', description: 'Validate against known solutions', tools: ['matplotlib'], estimated_time: '2h' },
      ]},
    ],
    deps: ['numpy>=1.20', 'scipy>=1.7', 'matplotlib>=3.5'],
  },
  general: {
    phases: [
      { phase: 'Problem Analysis', tasks: [{ task: 'Clarify requirements', description: 'Define input/output and success criteria', tools: [], estimated_time: '1h' }, { task: 'Survey existing methods', description: 'Search for prior art', tools: [], estimated_time: '2h' }] },
      { phase: 'Method Selection', tasks: [{ task: 'Select approach', description: 'Choose method based on constraints', tools: [], estimated_time: '2h' }] },
      { phase: 'Implementation', tasks: [{ task: 'Prototype', description: 'Implement core logic', tools: ['numpy'], estimated_time: '1d' }, { task: 'Test & iterate', description: 'Unit tests and debugging', tools: ['pytest'], estimated_time: '4h' }] },
      { phase: 'Validation', tasks: [{ task: 'Verify results', description: 'Check correctness', tools: [], estimated_time: '2h' }] },
    ],
    deps: ['numpy>=1.20', 'scipy>=1.7'],
  },
};

function totalTime(steps: GeneratePlanOutput['steps']): string {
  let h = 0;
  for (const p of steps) for (const t of p.tasks) { const m = t.estimated_time.match(/(\d+)\s*(h|d)/i); if (m) h += m[2] === 'd' ? parseInt(m[1]) * 8 : parseInt(m[1]); }
  if (h <= 8) return `${h}h`; if (h <= 40) return `${Math.ceil(h / 8)}d`; return `${Math.ceil(h / 40)}w`;
}

export function generatePlanRuleBased(input: GeneratePlanInput): GeneratePlanOutput {
  const classification = classifyTaskOutput.parse(input.classification);
  const tpl = TEMPLATES[classification.domain] || TEMPLATES.general;
  const phases = tpl.phases.map(p => ({ ...p, tasks: [...p.tasks] }));
  if (input.constraints?.length) phases[phases.length - 1].tasks.push({ task: 'Verify constraints', description: `Check: ${input.constraints.join('; ')}`, tools: [], estimated_time: '2h' });

  const risks: string[] = [];
  if (classification.complexity === 'complex') risks.push('High complexity — consider decomposition');
  if (classification.approach === 'machine_learning') risks.push('ML may require significant training resources');
  risks.push('Numerical instability possible — validate with known solutions');

  const criteria = ['Results match analytical solutions (if available)', 'Convergence observed with refinement', 'Reproducible across runs'];
  if (input.constraints?.length) criteria.push(...input.constraints.map(c => `Constraint: ${c}`));

  return { plan_id: genId(), title: input.task_description.slice(0, 80), classification, steps: phases, dependencies: tpl.deps, estimated_total_time: totalTime(phases), risks, success_criteria: criteria };
}

export async function generatePlanWithLLM(input: GeneratePlanInput): Promise<GeneratePlanOutput> {
  const classification = classifyTaskOutput.parse(input.classification);
  const prompt = `Generate a scientific analysis plan. Task: ${input.task_description}\nClassification: ${JSON.stringify(classification)}\n${input.constraints?.length ? `Constraints: ${input.constraints.join('; ')}` : ''}\nReturn JSON with: plan_id, title, classification, steps (array of {phase, tasks:[{task,description,tools,estimated_time}]}), dependencies, estimated_total_time, risks, success_criteria. Phases: Problem Analysis, Method Selection, Implementation, Validation.`;

  try {
    const base = process.env.AI4S_LLM_BASE_URL || process.env.DASHSCOPE_BASE_URL || '';
    const key = process.env.AI4S_LLM_API_KEY || process.env.DASHSCOPE_API_KEY || '';
    const model = process.env.AI4S_LLM_MODEL || 'qwen-plus';
    const resp = await fetch(`${base}/compatible-mode/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
    });
    if (!resp.ok) throw new Error(`LLM ${resp.status}`);
    const data = await resp.json() as any;
    const m = (data.choices?.[0]?.message?.content || '').match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON');
    return generatePlanOutput.parse(JSON.parse(m[0]));
  } catch (e) {
    console.warn('[Plan-First] LLM plan failed, fallback:', e);
    return generatePlanRuleBased(input);
  }
}

export async function generatePlan(input: GeneratePlanInput): Promise<GeneratePlanOutput> {
  return hasLLMConfig() ? generatePlanWithLLM(input) : generatePlanRuleBased(input);
}
