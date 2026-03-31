/**
 * Rule-based task classifier (offline mode)
 */
import type { ClassifyTaskInput, ClassifyTaskOutput } from './schemas.js';

interface Rule {
  patterns: RegExp[];
  domain: ClassifyTaskOutput['domain'];
  taskType: ClassifyTaskOutput['task_type'];
  approach: ClassifyTaskOutput['approach'];
  complexity: ClassifyTaskOutput['complexity'];
  deps: string[];
}

const RULES: Rule[] = [
  { patterns: [/CFD|Navier.Stokes|Reynolds|turbulence|流体|fluent|OpenFOAM/i], domain: 'fluid_dynamics', taskType: 'modeling', approach: 'numerical_simulation', complexity: 'complex', deps: ['numpy', 'scipy', 'matplotlib'] },
  { patterns: [/LAMMPS|GROMACS|MD.?simulation|分子动力学/i], domain: 'molecular_dynamics', taskType: 'modeling', approach: 'numerical_simulation', complexity: 'complex', deps: ['numpy', 'scipy', 'MDAnalysis'] },
  { patterns: [/PySCF|Gaussian|quantum.?chemistry|Hartree.?Fock|量子化学/i], domain: 'quantum_chemistry', taskType: 'modeling', approach: 'hybrid', complexity: 'complex', deps: ['numpy', 'scipy', 'pyscf'] },
  { patterns: [/VASP|quantum.?ESPRESSO|材料|band.?structure|phonon/i], domain: 'materials_science', taskType: 'modeling', approach: 'hybrid', complexity: 'complex', deps: ['numpy', 'scipy', 'ase'] },
  { patterns: [/BLAST|genome|protein|序列比对|bioinfo|RNA|DNA/i], domain: 'bioinformatics', taskType: 'data_analysis', approach: 'machine_learning', complexity: 'medium', deps: ['numpy', 'pandas', 'biopython', 'scikit-learn'] },
  { patterns: [/galaxy|cosmology|stellar|天文|FITS/i], domain: 'astronomy', taskType: 'data_analysis', approach: 'hybrid', complexity: 'medium', deps: ['numpy', 'astropy', 'matplotlib'] },
  { patterns: [/seismic|earthquake|地球科学|climate|气象/i], domain: 'earth_science', taskType: 'data_analysis', approach: 'numerical_simulation', complexity: 'complex', deps: ['numpy', 'scipy', 'xarray', 'netCDF4'] },
  { patterns: [/复现|reproduce|replicate/i], domain: 'general', taskType: 'paper_reproduction', approach: 'hybrid', complexity: 'medium', deps: ['numpy', 'matplotlib'] },
  { patterns: [/visual|plot|图表|matplotlib|seaborn|plotly/i], domain: 'general', taskType: 'visualization', approach: 'numerical_simulation', complexity: 'simple', deps: ['matplotlib', 'numpy'] },
  { patterns: [/optimi|优化|hyperparameter|tuning/i], domain: 'general', taskType: 'optimization', approach: 'machine_learning', complexity: 'medium', deps: ['numpy', 'scipy', 'optuna'] },
  { patterns: [/machine.?learn|deep.?learn|neural.?net|GNN|transformer/i], domain: 'general', taskType: 'new_method', approach: 'machine_learning', complexity: 'complex', deps: ['numpy', 'torch', 'scikit-learn'] },
];

export function classifyRuleBased(input: ClassifyTaskInput): ClassifyTaskOutput {
  const desc = input.task_description;
  let bestRule: Rule | null = null;
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const p of rule.patterns) { if (p.test(desc)) score++; }
    if (score > bestScore) { bestScore = score; bestRule = rule; }
  }

  if (bestRule) {
    const duration = bestRule.complexity === 'complex' ? 'weeks' : bestRule.complexity === 'medium' ? 'days' : 'hours';
    return {
      domain: bestRule.domain, task_type: bestRule.taskType, complexity: bestRule.complexity,
      approach: bestRule.approach, estimated_duration: duration, dependencies: bestRule.deps,
      confidence: Math.min(0.6 + bestScore * 0.1, 0.95),
      reasoning: `Matched ${bestScore} pattern(s): ${bestRule.patterns.filter(p => p.test(desc)).map(p => p.source).join(', ')}`,
    };
  }

  return {
    domain: 'general', task_type: 'data_analysis', complexity: 'medium', approach: 'hybrid',
    estimated_duration: 'days', dependencies: ['numpy', 'scipy', 'matplotlib'],
    confidence: 0.3, reasoning: 'No specific domain patterns matched; using defaults.',
  };
}
