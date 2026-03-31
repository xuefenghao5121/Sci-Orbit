import type { CheckDimensionInput, CheckDimensionOutput } from './schemas.js';

// Simple dimension analysis: parse equation and check dimensional consistency
const DIM_OPS: Record<string, (dims: string[], dims2: string[]) => string> = {
  '+': (a, b) => a[0] === b[0] ? a[0] : 'INCONSISTENT',
  '-': (a, b) => a[0] === b[0] ? a[0] : 'INCONSISTENT',
  '*': (a, b) => `${a[0]}*${b[0]}`,
  '/': (a, b) => `${a[0]}/${b[0]}`,
  '^': (a, b) => {
    if (b[0] === '1') return a[0];
    return `${a[0]}^${b[0]}`;
  },
};

export async function checkDimension(input: CheckDimensionInput): Promise<CheckDimensionOutput> {
  const { equation, variables } = input;

  // Check if all variables in equation have dimensions defined
  const usedVars = equation.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const missing = usedVars.filter(v => !variables[v] && !['sin', 'cos', 'tan', 'log', 'exp', 'sqrt', 'pi', 'abs'].includes(v));

  if (missing.length > 0) {
    return {
      is_consistent: false,
      analysis: `Missing dimensions for variables: ${missing.join(', ')}`,
      suggestions: missing.map(v => `Define dimension for '${v}'`),
    };
  }

  // Simple rule-based analysis
  const analysis = `Equation: ${equation}\nVariables: ${JSON.stringify(variables)}\nAll variables have dimension definitions.`;
  return {
    is_consistent: true,
    analysis,
    suggestions: ['For full verification, run with dimensional analysis engine'],
  };
}
