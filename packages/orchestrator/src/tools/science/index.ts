/**
 * Science Tools — MCP Tool Definitions & Exports
 */
export { sciencePyscf } from './pyscf.js';
export { scienceRdkit } from './rdkit.js';
export { scienceOpenmm } from './openmm.js';
export { scienceJupyter } from './jupyter.js';
export * from './schemas.js';

import { sciencePyscf } from './pyscf.js';
import { scienceRdkit } from './rdkit.js';
import { scienceOpenmm } from './openmm.js';
import { scienceJupyter } from './jupyter.js';
import type { MCPToolDefinition } from '../types.js';
import type { SciencePyscfInput, ScienceRdkitInput, ScienceOpenmmInput, ScienceJupyterInput } from './schemas.js';
import { wrapError, AI4SErrorCode } from '../../utils/errors.js';

export const scienceTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'science_pyscf',
    description: 'Quantum chemistry calculations via PySCF (SCF, geometry optimization, frequency analysis)',
    inputSchema: { type: 'object', properties: { calculation_type: { type: 'string', enum: ['scf', 'opt', 'freq'] }, molecule: { type: 'object', description: '{format: smiles|xyz, value: string}' }, basis_set: { type: 'string' }, charge: { type: 'number' }, spin: { type: 'number' }, functional: { type: 'string' } }, required: ['calculation_type', 'molecule'] },
    handler: (i) => {
      try { return sciencePyscf(i as SciencePyscfInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'science_rdkit',
    description: 'Molecular analysis via RDKit (descriptors, fingerprints, 3D coordinates, similarity)',
    inputSchema: { type: 'object', properties: { operation: { type: 'string', enum: ['descriptor', 'fingerprint', '3d', 'similarity'] }, molecules: { type: 'array', items: { type: 'object' } }, fp_type: { type: 'string' }, fp_radius: { type: 'number' }, fp_bits: { type: 'number' } }, required: ['operation', 'molecules'] },
    handler: (i) => {
      try { return scienceRdkit(i as ScienceRdkitInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'science_openmm',
    description: 'Molecular dynamics simulation via OpenMM',
    inputSchema: { type: 'object', properties: { forcefield: { type: 'string' }, pdb_file: { type: 'string' }, simulation_params: { type: 'object' }, output_dir: { type: 'string' } }, required: ['pdb_file'] },
    handler: (i) => {
      try { return scienceOpenmm(i as ScienceOpenmmInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'science_jupyter',
    description: 'Jupyter notebook operations (create, run, export)',
    inputSchema: { type: 'object', properties: { operation: { type: 'string', enum: ['create', 'run', 'export'] }, notebook_path: { type: 'string' }, cells: { type: 'array', items: { type: 'object' } }, export_format: { type: 'string' } }, required: ['operation', 'notebook_path'] },
    handler: (i) => {
      try { return scienceJupyter(i as ScienceJupyterInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
];

// v0.5.0 精简导出：只保留计算工具（jupyter 由 Claude Code 操作）
export const scienceComputeTools: MCPToolDefinition<unknown, unknown>[] = scienceTools.filter(t => t.name !== 'science_jupyter');
