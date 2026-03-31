import { describe, it, expect } from 'vitest';
/**
 * Science tools unit tests
 */
import { sciencePyscf } from '../pyscf.js';
import { scienceRdkit } from '../rdkit.js';
import { scienceOpenmm } from '../openmm.js';
import { scienceJupyter } from '../jupyter.js';

describe('science_pyscf', () => {
  it('should generate pyscf script', async () => {
    const result = await sciencePyscf({
      calculation_type: 'scf',
      molecule: { format: 'smiles', value: 'CCO' },
      basis_set: '6-31G*',
    });
    expect(result).toBeDefined();
  });
});

describe('science_rdkit', () => {
  it('should generate rdkit script', async () => {
    const result = await scienceRdkit({
      operation: 'descriptor',
      molecules: [{ format: 'smiles', value: 'CCO' }],
    });
    expect(result).toBeDefined();
  });
});

describe('science_openmm', () => {
  it('should generate openmm script', async () => {
    const result = await scienceOpenmm({ pdb_file: '/tmp/test.pdb' });
    expect(result.trajectory_path).toBeTruthy();
  });
});

describe('science_jupyter', () => {
  it('should create notebook', async () => {
    const result = await scienceJupyter({
      operation: 'create',
      notebook_path: '/tmp/test.ipynb',
      cells: [{ cell_type: 'code', source: 'print("hello")' }],
    });
    expect(result.notebook_path).toBeTruthy();
  });
});
