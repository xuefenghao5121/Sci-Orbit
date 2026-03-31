/**
 * Science tools unit tests
 */
import { sciencePyscf } from '../science/pyscf.js';
import { scienceRdkit } from '../science/rdkit.js';
import { scienceOpenmm } from '../science/openmm.js';
import { scienceJupyter } from '../science/jupyter.js';

describe('science_pyscf', () => {
  it('should generate PySCF script', async () => {
    const result = await sciencePyscf({
      calculation: 'hf',
      basis: 'sto-3g',
      molecule: 'H2 0 0 0; H 0 0 0.74',
    });
    expect(result.script).toContain('pyscf');
  });
});

describe('science_rdkit', () => {
  it('should generate RDKit script', async () => {
    const result = await scienceRdkit({
      operation: 'smiles_to_3d',
      smiles: 'CCO',
    });
    expect(result.script).toBeTruthy();
  });
});

describe('science_openmm', () => {
  it('should generate OpenMM script', async () => {
    const result = await scienceOpenmm({
      system: 'alanine_dipeptide',
      forcefield: 'amber14-all.xml',
      steps: 1000,
    });
    expect(result.script).toBeTruthy();
  });
});

describe('science_jupyter', () => {
  it('should generate notebook code', async () => {
    const result = await scienceJupyter({
      code: 'import numpy as np\nprint(np.array([1,2,3]))',
      kernel: 'python3',
    });
    expect(result.output).toBeDefined();
  });
});
