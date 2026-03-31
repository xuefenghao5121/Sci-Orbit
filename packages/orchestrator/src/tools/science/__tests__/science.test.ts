import { describe, it } from 'vitest';
import { sciencePyscf } from '../pyscf.js';
import { scienceRdkit } from '../rdkit.js';
import { scienceOpenmm } from '../openmm.js';
import { scienceJupyter } from '../jupyter.js';

describe('science tools', () => {
  it('pyscf generates script', async () => {
    const result = await sciencePyscf({
      calculation_type: 'scf',
      molecule: { format: 'smiles', value: 'CCO' },
      basis_set: '6-31G*',
    });
    console.log('pyscf result keys:', Object.keys(result));
  });

  it('rdkit generates script', async () => {
    const result = await scienceRdkit({
      operation: 'descriptor',
      molecules: [{ format: 'smiles', value: 'CCO' }],
    });
    console.log('rdkit result keys:', Object.keys(result));
  });

  it('openmm generates script', async () => {
    const result = await scienceOpenmm({
      pdb_file: '/tmp/test.pdb',
    });
    console.log('openmm result:', result.trajectory_path);
  });

  it('jupyter create', async () => {
    const result = await scienceJupyter({
      operation: 'create',
      notebook_path: '/tmp/test.ipynb',
      cells: [{ cell_type: 'code', source: 'print("hello")' }],
    });
    console.log('jupyter result:', result.notebook_path);
  });
});
