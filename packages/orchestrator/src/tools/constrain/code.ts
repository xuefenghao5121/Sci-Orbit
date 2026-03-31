import type { CheckCodeInput, CheckCodeOutput } from './schemas.js';

export async function checkCode(input: CheckCodeInput): Promise<CheckCodeOutput> {
  const { code, language, checks } = input;
  const issues: CheckCodeOutput['issues'] = [];
  const suggestions: string[] = [];
  let score = 100;

  const lines = code.split('\n');

  // Precision checks
  if (checks.includes('precision')) {
    // Check for float comparison issues
    lines.forEach((line, i) => {
      if (/==\s*[\d.]+/.test(line) && !/\.0\s*==/.test(line)) {
        issues.push({ line: i + 1, severity: 'warning', message: 'Potential float equality comparison — use tolerance-based comparison' });
        score -= 5;
      }
    });
    // Check for single precision usage
    if (language === 'c++') {
      lines.forEach((line, i) => {
        if (/\bfloat\b/.test(line) && !/double|long double/.test(line)) {
          issues.push({ line: i + 1, severity: 'warning', message: 'Consider using double instead of float for scientific computing' });
          score -= 3;
        }
      });
    }
    if (language === 'python') {
      if (!code.includes('numpy') && !code.includes('np.')) {
        suggestions.push('Consider using numpy for numerical computations');
        score -= 5;
      }
    }
  }

  // Reproducibility checks
  if (checks.includes('reproducibility')) {
    if (language === 'python') {
      if (code.includes('random') && !code.includes('seed') && !code.includes('random_state') && !code.includes('rng')) {
        issues.push({ line: 0, severity: 'error', message: 'Random operations without seed — results will not be reproducible' });
        score -= 10;
      }
    }
    if (language === 'c++') {
      if (code.includes('rand()') && !code.includes('srand(')) {
        issues.push({ line: 0, severity: 'error', message: 'rand() without srand() — non-reproducible' });
        score -= 10;
      }
    }
    suggestions.push('Set random seeds explicitly for reproducibility');
  }

  // Performance checks
  if (checks.includes('performance')) {
    if (language === 'python') {
      lines.forEach((line, i) => {
        if (/for\s+\w+\s+in\s+range\(/.test(line) && !/numpy|np\.|vectorize/.test(code)) {
          issues.push({ line: i + 1, severity: 'warning', message: 'Python for-loop detected — consider vectorization with numpy' });
          score -= 5;
        }
      });
      if (!code.includes('import numpy') && !code.includes('from numpy')) {
        suggestions.push('Use numpy for array operations instead of Python loops');
        score -= 5;
      }
    }
    if (language === 'c++') {
      if (code.includes('std::cout') && /for\s*\(/.test(code)) {
        issues.push({ line: 0, severity: 'warning', message: 'cout inside loop — consider buffering output' });
        score -= 3;
      }
    }
  }

  return { issues, suggestions, score: Math.max(0, score) };
}
