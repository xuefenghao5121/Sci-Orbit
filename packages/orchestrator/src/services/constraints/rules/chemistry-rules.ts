// Chemistry constraint rules

export const COMMON_ELEMENTS: Record<string, { symbol: string; atomicNumber: number; mass: number; group?: number }> = {
  'H': { symbol: 'H', atomicNumber: 1, mass: 1.008, group: 1 },
  'He': { symbol: 'He', atomicNumber: 2, mass: 4.003, group: 18 },
  'Li': { symbol: 'Li', atomicNumber: 3, mass: 6.941, group: 1 },
  'C': { symbol: 'C', atomicNumber: 6, mass: 12.011, group: 14 },
  'N': { symbol: 'N', atomicNumber: 7, mass: 14.007, group: 15 },
  'O': { symbol: 'O', atomicNumber: 8, mass: 15.999, group: 16 },
  'Na': { symbol: 'Na', atomicNumber: 11, mass: 22.990, group: 1 },
  'Cl': { symbol: 'Cl', atomicNumber: 17, mass: 35.453, group: 17 },
  'Fe': { symbol: 'Fe', atomicNumber: 26, mass: 55.845, group: 8 },
  'Cu': { symbol: 'Cu', atomicNumber: 29, mass: 63.546, group: 11 },
  'Au': { symbol: 'Au', atomicNumber: 79, mass: 196.967, group: 11 },
};

export interface BalanceCheckResult {
  balanced: boolean;
  elements: Record<string, { left: number; right: number }>;
  message?: string;
}

export function checkChemicalBalance(equation: string): BalanceCheckResult {
  // Simplified chemical equation balance checker
  const parts = equation.split('->').length === 2 ? equation.split('->') :
                 equation.split('→').length === 2 ? equation.split('→') :
                 equation.split('=');
  if (parts.length !== 2) return { balanced: false, elements: {}, message: 'Invalid equation format' };

  const parseSide = (side: string): Record<string, number> => {
    const elements: Record<string, number> = {};
    const molecules = side.split('+').map(s => s.trim());
    for (const mol of molecules) {
      const match = mol.match(/^(\d*)([A-Z][a-z]*)(\d*)/);
      if (match) {
        const coeff = parseInt(match[1] || '1');
        const elem = match[2];
        const count = parseInt(match[3] || '1') * coeff;
        elements[elem] = (elements[elem] || 0) + count;
      }
    }
    return elements;
  };

  const left = parseSide(parts[0]);
  const right = parseSide(parts[1]);
  const allElements = new Set([...Object.keys(left), ...Object.keys(right)]);
  const elements: Record<string, { left: number; right: number }> = {};
  let balanced = true;

  for (const elem of allElements) {
    const l = left[elem] || 0;
    const r = right[elem] || 0;
    elements[elem] = { left: l, right: r };
    if (l !== r) balanced = false;
  }

  return { balanced, elements };
}
