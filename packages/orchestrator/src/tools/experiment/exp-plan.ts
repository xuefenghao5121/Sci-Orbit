import type { ExpPlanInput, ExpPlanOutput } from './schemas.js';
import { expPlanOutput } from './schemas.js';
const genId = () => `exp_${Date.now().toString(36)}`;

export function expPlan(input: ExpPlanInput): ExpPlanOutput {
  return expPlanOutput.parse({
    experiment_id: genId(),
    task: input.task,
    phases: [
      { name: 'Setup', description: 'Environment and data preparation', steps: ['Install dependencies', 'Download dataset', 'Verify GPU availability'], estimated_time: '30min' },
      { name: 'Baseline', description: 'Run baseline configuration', steps: ['Configure baseline params', 'Run training', 'Log metrics'], estimated_time: '2h' },
      { name: 'Experiment', description: 'Run experiment variants', steps: ['Sweep hyperparameters', 'Run each config', 'Collect results'], estimated_time: '4h' },
      { name: 'Analysis', description: 'Compare and analyze results', steps: ['Aggregate metrics', 'Generate plots', 'Write report'], estimated_time: '1h' },
    ],
    configs: [
      { key: 'learning_rate', value: '0.001', description: 'Initial learning rate' },
      { key: 'batch_size', value: '32', description: 'Training batch size' },
      { key: 'epochs', value: '100', description: 'Number of training epochs' },
    ],
    expected_results: ['Accuracy improvement over baseline', 'Convergence curves', 'Resource utilization report'],
    resource_requirements: input.resources || { gpu: 'any', cpu_cores: 4, ram_gb: 16, time_limit_hours: 8 },
  });
}
