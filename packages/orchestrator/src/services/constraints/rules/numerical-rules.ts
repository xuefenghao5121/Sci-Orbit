// Numerical computation constraint rules

export interface NumericalCheckResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; value?: number; threshold?: number }>;
}

/**
 * Check if values contain NaN or Infinity
 */
export function checkNaNInf(values: number[]): { hasNaN: boolean; hasInf: boolean; indices: number[] } {
  const nanIndices: number[] = [];
  const infIndices: number[] = [];
  values.forEach((v, i) => {
    if (Number.isNaN(v)) nanIndices.push(i);
    if (!Number.isFinite(v)) infIndices.push(i);
  });
  return { hasNaN: nanIndices.length > 0, hasInf: infIndices.length > 0, indices: [...nanIndices, ...infIndices] };
}

/**
 * Check numerical stability (condition number heuristic)
 */
export function checkStability(values: number[], threshold: number = 1e10): boolean {
  const max = Math.max(...values.map(Math.abs));
  const min = Math.min(...values.map(v => Math.abs(v) > 1e-15 ? Math.abs(v) : Infinity));
  if (min === Infinity) return false;
  return max / min < threshold;
}

/**
 * Check convergence (relative change between last values)
 */
export function checkConvergence(values: number[], tolerance: number = 1e-8, windowSize: number = 10): boolean {
  if (values.length < 2) return false;
  const recent = values.slice(-windowSize);
  const maxChange = Math.max(...recent.slice(1).map((v, i) => Math.abs(v - recent[i]) / (Math.abs(recent[i]) + 1e-15)));
  return maxChange < tolerance;
}

/**
 * Check energy conservation (sum of values should be constant)
 */
export function checkEnergyConservation(values: number[], tolerance: number = 1e-6): { conserved: boolean; drift: number } {
  if (values.length < 2) return { conserved: true, drift: 0 };
  const initial = values[0];
  const maxDrift = Math.max(...values.map(v => Math.abs(v - initial)));
  return { conserved: maxDrift < tolerance, drift: maxDrift };
}

/**
 * Run all numerical checks
 */
export function runNumericalChecks(values: number[]): NumericalCheckResult {
  const nanInf = checkNaNInf(values);
  const checks: NumericalCheckResult['checks'] = [
    { name: 'no-nan-inf', passed: !nanInf.hasNaN && !nanInf.hasInf },
    { name: 'stability', passed: values.length > 0 && checkStability(values) },
    { name: 'convergence', passed: checkConvergence(values) },
  ];

  if (values.length > 1) {
    const energy = checkEnergyConservation(values);
    checks.push({ name: 'energy-conservation', passed: energy.conserved, value: energy.drift, threshold: 1e-6 });
  }

  return { passed: checks.every(c => c.passed), checks };
}
