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
  // Dimensional analysis with full operator support
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

  // Parse a dimension expression (e.g., "m/s^2", "kg*m/s^2", "MLT⁻²") into a map
  private parseDimExpression(dimStr: string, multiplier: number = 1): Map<string, number> {
    let result = new Map<string, number>();
    // First check if it contains / or * operators → recursive parse
    if (/[/]/.test(dimStr)) {
      const parts = dimStr.split('/');
      // First part is numerator
      result = this.mergeDimensions(result, this.parseDimExpression(parts[0].trim(), 1), 1);
      // Remaining parts are denominators
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].trim()) {
          result = this.mergeDimensions(result, this.parseDimExpression(parts[i].trim(), 1), -1);
        }
      }
      // Apply overall multiplier
      if (multiplier !== 1) {
        for (const [k, v] of result) {
          result.set(k, v * multiplier);
        }
      }
      return result;
    }
    // No / operator — check for ^ power
    if (dimStr.includes('^')) {
      const parts = dimStr.split('*').map(s => s.trim());
      for (const part of parts) {
        const powMatch = part.match(/^(.+?)\^(-?\d+)$/);
        if (powMatch) {
          const base = powMatch[1];
          const exp = parseInt(powMatch[2], 10) * multiplier;
          const baseParsed = this.parseDimExpression(base, exp);
          result = this.mergeDimensions(result, baseParsed, 1);
        } else {
          result = this.mergeDimensions(result, this.parseDimExpression(part, multiplier), 1);
        }
      }
      return result;
    }
    // No operators — check for * concatenation (e.g., "kg*m")
    if (dimStr.includes('*')) {
      const parts = dimStr.split('*').map(s => s.trim());
      for (const part of parts) {
        result = this.mergeDimensions(result, this.parseDimExpression(part, multiplier), 1);
      }
      return result;
    }
    // Atomic — check dimensions map first, then parse as individual symbols
    const mapped = this.dimensions[dimStr.trim()];
    if (mapped) {
      return this.parseDimensionString(mapped, multiplier);
    }
    return this.parseDimensionString(dimStr, multiplier);
  }

  // Parse a single dimension token like "ML²T⁻²" or "kg" or "m" into a map
  private parseDimensionString(dimStr: string, multiplier: number): Map<string, number> {
    const result = new Map<string, number>();
    // Match patterns like M, L², T⁻², etc.
    const regex = /([A-ZΘa-z])(⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)?/g;
    let match;
    while ((match = regex.exec(dimStr)) !== null) {
      const symbol = match[1];
      let exponent = 1;
      if (match[2]) {
        // Convert superscript to regular number
        const superscriptMap: Record<string, string> = {
          '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
          '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-'
        };
        const expStr = match[2].replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => superscriptMap[c] || c);
        exponent = parseInt(expStr, 10);
      }
      const existing = result.get(symbol) || 0;
      result.set(symbol, existing + exponent * multiplier);
    }
    // Remove zero exponents
    for (const [k, v] of result) {
      if (v === 0) result.delete(k);
    }
    return result;
  }

  // Merge two dimension maps
  private mergeDimensions(
    base: Map<string, number>,
    add: Map<string, number>,
    multiplier: number
  ): Map<string, number> {
    const result = new Map(base);
    for (const [k, v] of add) {
      const existing = result.get(k) || 0;
      const newVal = existing + v * multiplier;
      if (newVal === 0) result.delete(k);
      else result.set(k, newVal);
    }
    return result;
  }

  parse(expr: string, variables: Record<string, string>): Map<string, number> | null {
    let result = new Map<string, number>();
    let currentOp: '*' | '/' = '*';
    
    // Tokenize expression: split by * and / while preserving operator order
    const tokens: Array<{ type: 'var' | 'op'; value: string }> = [];
    let current = '';
    let i = 0;
    
    while (i < expr.length) {
      const ch = expr[i];
      if (ch === '*' || ch === '/') {
        if (current.trim()) {
          tokens.push({ type: 'var', value: current.trim() });
        }
        tokens.push({ type: 'op', value: ch });
        current = '';
        i++;
      } else if (ch === '(' || ch === ')') {
        // Skip parentheses for now (simplified)
        i++;
      } else {
        current += ch;
        i++;
      }
    }
    if (current.trim()) {
      tokens.push({ type: 'var', value: current.trim() });
    }

    // Process tokens
    for (const token of tokens) {
      if (token.type === 'op') {
        currentOp = token.value as '*' | '/';
      } else {
        // Handle power operator: e.g., s^2
        let varName = token.value;
        let exponent = 1;
        
        const powMatch = varName.match(/^(.+?)\^(\d+)$/);
        if (powMatch) {
          varName = powMatch[1];
          exponent = parseInt(powMatch[2], 10);
        }

        // Get dimension for variable
        const dimStr = variables[varName] || this.dimensions[varName];
        if (!dimStr) {
          // Unknown dimension, use variable name as dimension symbol
          const mult = currentOp === '*' ? exponent : -exponent;
          const existing = result.get(varName) || 0;
          result.set(varName, existing + mult);
          continue;
        }

        // Parse the dimension string and merge
        const multiplier = currentOp === '*' ? exponent : -exponent;
        const parsed = this.parseDimExpression(dimStr, multiplier);
        result = this.mergeDimensions(result, parsed, 1);
      }
    }

    return result;
  }

  simplify(dims: Map<string, number> | null): string {
    if (!dims || dims.size === 0) return '1';
    
    // Order dimensions conventionally: MLTΘINJ
    const order = ['M', 'L', 'T', 'Θ', 'I', 'N', 'J'];
    const sorted: Array<[string, number]> = [];
    
    for (const sym of order) {
      if (dims.has(sym)) sorted.push([sym, dims.get(sym)!]);
    }
    // Add any other symbols
    for (const [k, v] of dims) {
      if (!order.includes(k)) sorted.push([k, v]);
    }

    const superscriptMap: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
    };

    const toSuperscript = (n: number): string => {
      if (n === 1) return '';
      return String(n).split('').map(c => superscriptMap[c] || c).join('');
    };

    return sorted.map(([k, v]) => `${k}${toSuperscript(v)}`).join('');
  }
}
