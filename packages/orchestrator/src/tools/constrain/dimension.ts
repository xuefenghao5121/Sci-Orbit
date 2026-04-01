import type { CheckDimensionInput, CheckDimensionOutput } from './schemas.js';
import { ConstraintEngine } from '../../services/constraints/engine.js';

const constraintEngine = new ConstraintEngine();

export async function checkDimension(input: CheckDimensionInput): Promise<CheckDimensionOutput> {
  const { equation, variables } = input;

  // Check if all variables in equation have dimensions defined
  const usedVars = equation.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const mathFunctions = ['sin', 'cos', 'tan', 'log', 'exp', 'sqrt', 'pi', 'abs', 'ln', 'max', 'min'];
  const missing = usedVars.filter(v => !variables[v] && !mathFunctions.includes(v));

  if (missing.length > 0) {
    return {
      is_consistent: false,
      analysis: `Missing dimensions for variables: ${missing.join(', ')}`,
      suggestions: missing.map(v => `Define dimension for '${v}'`),
    };
  }

  // Use ConstraintEngine for actual dimensional analysis
  const result = constraintEngine.checkDimension(equation, variables);

  const analysis = result.details 
    ? `Equation: ${equation}\nVariables: ${JSON.stringify(variables)}\nLHS dimension: ${result.details.split(',')[0]?.replace('LHS: ', '') || 'unknown'}\nRHS dimension: ${result.details.split(',')[1]?.replace(' RHS: ', '') || 'unknown'}`
    : `Equation: ${equation}\nVariables: ${JSON.stringify(variables)}`;

  const suggestions: string[] = [];
  if (!result.passed && result.error) {
    suggestions.push(result.error);
    // Try to provide helpful suggestions based on common mistakes
    if (result.error.includes('Dimension mismatch')) {
      suggestions.push('Check if all terms have consistent units');
      suggestions.push('Verify conversion factors are included');
    }
  } else {
    suggestions.push('Dimensional analysis passed - equation is dimensionally consistent');
  }

  return {
    is_consistent: result.passed,
    analysis,
    suggestions,
  };
}
