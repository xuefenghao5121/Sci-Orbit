import type { CheckConservationInput, CheckConservationOutput } from './schemas.js';

export async function checkConservation(input: CheckConservationInput): Promise<CheckConservationOutput> {
  const { simulation_results, law, tolerance } = input;

  // Identify likely conservation columns
  const keys = Object.keys(simulation_results[0] || {});
  const valueKey = keys.find(k => k.toLowerCase().includes(law)) || keys.find(k => k !== 'time' && k !== 'step' && k !== 't') || keys[0];
  const timeKey = keys.find(k => ['time', 'step', 't'].includes(k.toLowerCase())) || keys[0];

  const values = simulation_results.map((r: Record<string, number>) => r[valueKey] || 0);
  const timesteps = simulation_results.map((r: Record<string, number>) => r[timeKey] || 0);

  const initial = values[0] || 1;
  const deviations = values.map(v => Math.abs(v - initial) / (Math.abs(initial) + 1e-10));
  const maxDeviation = Math.max(...deviations);
  const isConserved = maxDeviation <= tolerance;

  return {
    is_conserved: isConserved,
    deviation: maxDeviation,
    plot_data: {
      timesteps,
      values,
      label: `${law} conservation check`,
    },
  };
}
