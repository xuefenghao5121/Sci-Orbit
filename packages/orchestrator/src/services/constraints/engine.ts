export interface DimensionCheckResult {
  passed: boolean;
  equation: string;
  error?: string;
  details?: string;
}

export interface ConservationCheckResult {
  passed: boolean;
  law: string;
  error?: number | string;
  details?: string;
}

export interface RangeCheckResult {
  passed: boolean;
  violations: Array<{ index: number; value: number; min?: number; max?: number }>;
}

export interface CodeCheckResult {
  passed: boolean;
  issues: Array<{ rule: string; message: string; line?: number }>;
}

export interface CheckReport {
  timestamp: string;
  checks: {
    dimension?: DimensionCheckResult;
    conservation?: ConservationCheckResult;
    range?: RangeCheckResult;
    code?: CodeCheckResult;
  };
  summary: { passed: number; failed: number; total: number };
}

export class ConstraintEngine {
  checkDimension(equation: string, variables: Record<string, string>): DimensionCheckResult {
    const parser = new DimensionParser();
    try {
      const leftRight = equation.split('=');
      if (leftRight.length !== 2) return { passed: false, equation, error: 'Invalid equation format, expected LHS = RHS' };

      const leftDims = parser.parse(leftRight[0], variables);
      const rightDims = parser.parse(leftRight[1], variables);

      if (!leftDims || !rightDims) return { passed: false, equation, error: 'Failed to parse dimensions' };

      const leftStr = parser.simplify(leftDims);
      const rightStr = parser.simplify(rightDims);

      const passed = leftStr === rightStr;
      return { passed, equation, error: passed ? undefined : `Dimension mismatch: ${leftStr} ≠ ${rightStr}`, details: `LHS: ${leftStr}, RHS: ${rightStr}` };
    } catch (e: any) {
      return { passed: false, equation, error: e.message };
    }
  }

  checkConservation(data: number[], law: string): ConservationCheckResult {
    const sum = data.reduce((a, b) => a + b, 0);
    switch (law) {
      case 'energy':
      case 'mass':
      case 'momentum':
      case 'charge': {
        // Check if sum is approximately constant (within tolerance)
        const mean = sum / data.length;
        const variance = data.reduce((a, v) => a + (v - mean) ** 2, 0) / data.length;
        const passed = variance < 1e-6;
        return { passed, law, error: passed ? undefined : variance, details: `mean=${mean.toFixed(6)}, variance=${variance.toExponential(2)}` };
      }
      default:
        return { passed: false, law, error: `Unknown conservation law: ${law}` };
    }
  }

  checkRange(values: number[], domain: { min?: number; max?: number }): RangeCheckResult {
    const violations: RangeCheckResult['violations'] = [];
    values.forEach((v, i) => {
      if (domain.min !== undefined && v < domain.min) violations.push({ index: i, value: v, min: domain.min });
      if (domain.max !== undefined && v > domain.max) violations.push({ index: i, value: v, max: domain.max });
    });
    return { passed: violations.length === 0, violations };
  }

  checkCode(code: string, checks: string[] = ['no-eval', 'type-annotations', 'error-handling']): CodeCheckResult {
    const issues: CodeCheckResult['issues'] = [];
    const lines = code.split('\n');

    if (checks.includes('no-eval')) {
      lines.forEach((line, i) => {
        if (/\beval\s*\(/.test(line) || /\bexec\s*\(/.test(line)) {
          issues.push({ rule: 'no-eval', message: 'Use of eval/exec is prohibited', line: i + 1 });
        }
      });
    }

    if (checks.includes('type-annotations')) {
      // Check Python functions for type annotations
      const funcMatches = code.match(/def\s+\w+\s*\([^)]*\)\s*:/g);
      if (funcMatches) {
        funcMatches.forEach(fn => {
          if (!fn.includes('->') && !fn.includes(': ')) {
            issues.push({ rule: 'type-annotations', message: `Function missing return type annotation: ${fn}` });
          }
        });
      }
    }

    if (checks.includes('error-handling')) {
      const tryMatches = (code.match(/try\s*:/g) || []).length;
      const exceptMatches = (code.match(/except|catch/g) || []).length;
      const riskyCalls = code.match(/\.(open|read|write|connect|request|fetch)\s*\(/g);
      if (riskyCalls && riskyCalls.length > 0 && tryMatches === 0) {
        issues.push({ rule: 'error-handling', message: `Found ${riskyCalls.length} risky calls without try/catch` });
      }
    }

    return { passed: issues.length === 0, issues };
  }

  runAllChecks(content: { equation?: string; variables?: Record<string, string>; data?: number[]; law?: string; values?: number[]; domain?: { min?: number; max?: number }; code?: string }, enabledChecks: string[] = ['dimension', 'conservation', 'range', 'code']): CheckReport {
    const checks: CheckReport['checks'] = {};
    let passed = 0, failed = 0;

    if (enabledChecks.includes('dimension') && content.equation && content.variables) {
      checks.dimension = this.checkDimension(content.equation, content.variables);
      checks.dimension.passed ? passed++ : failed++;
    }
    if (enabledChecks.includes('conservation') && content.data && content.law) {
      checks.conservation = this.checkConservation(content.data, content.law);
      checks.conservation.passed ? passed++ : failed++;
    }
    if (enabledChecks.includes('range') && content.values && content.domain) {
      checks.range = this.checkRange(content.values, content.domain);
      checks.range.passed ? passed++ : failed++;
    }
    if (enabledChecks.includes('code') && content.code) {
      checks.code = this.checkCode(content.code);
      checks.code.passed ? passed++ : failed++;
    }

    return { timestamp: new Date().toISOString(), checks, summary: { passed, failed, total: passed + failed } };
  }
}

class DimensionParser {
  // Simplified dimensional analysis
  private dimensions: Record<string, string> = {
    'length': 'L', 'mass': 'M', 'time': 'T', 'temperature': 'Θ',
    'current': 'I', 'amount': 'N', 'luminosity': 'J',
    'm': 'L', 'kg': 'M', 's': 'T', 'K': 'Θ', 'A': 'I', 'mol': 'N', 'cd': 'J',
    'meter': 'L', 'kilogram': 'M', 'second': 'T', 'kelvin': 'Θ', 'ampere': 'I',
    'N': 'MLT⁻²', 'J': 'ML²T⁻²', 'W': 'ML²T⁻³', 'Pa': 'ML⁻¹T⁻²',
    'V': 'ML²T⁻³I⁻¹', 'Hz': 'T⁻¹', 'eV': 'ML²T⁻²',
    'velocity': 'LT⁻¹', 'acceleration': 'LT⁻²', 'force': 'MLT⁻²',
    'energy': 'ML²T⁻²', 'power': 'ML²T⁻³', 'pressure': 'ML⁻¹T⁻²',
  };

  parse(expr: string, variables: Record<string, string>): Map<string, number> | null {
    const dims = new Map<string, number>();
    // Simple parsing: tokenize and multiply dimensions
    const tokens = expr.replace(/[()]/g, '').split(/\s*[\*\/]\s*/);
    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed || trimmed === '') continue;
      const dim = variables[trimmed] || this.dimensions[trimmed] || trimmed;
      // Parse dimension like "ML²T⁻²"
      for (const ch of dim) {
        // Handle superscript
        const existing = dims.get(ch) || 0;
        // Simplified: just track the raw dimension string
      }
      // Simplified: just return the dimension string
      return new Map([[dim, 1]]);
    }
    return dims;
  }

  simplify(dims: Map<string, number> | null): string {
    if (!dims || dims.size === 0) return '1';
    const entries = Array.from(dims.entries());
    if (entries.length === 1 && entries[0][1] === 1) return entries[0][0];
    return entries.map(([k, v]) => v === 1 ? k : `${k}${v}`).join('');
  }
}
