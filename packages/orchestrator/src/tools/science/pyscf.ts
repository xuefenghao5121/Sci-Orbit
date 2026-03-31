import type { SciencePyscfInput, SciencePyscfOutput } from './schemas.js';

export async function sciencePyscf(input: SciencePyscfInput): Promise<SciencePyscfOutput> {
  const { calculation_type, molecule, basis_set, charge, spin, functional } = input;
  const molBlock = molecule.format === 'smiles'
    ? `mol = Chem.MolFromSmiles("${molecule.value}")\nmol = Chem.AddHs(mol)\nAllChem.EmbedMolecule(mol)`
    : `# Load XYZ: ${molecule.value}`;

  const calcBlock = calculation_type === 'scf'
    ? `mf = scf.RHF(mol)\nmf.kernel()\nprint(f"SCF Energy: {mf.e_tot()}")`
    : calculation_type === 'opt'
    ? `mf = scf.RHF(mol)\nmf.kernel()\nopt = optimizeOptimizer(mf)\nopt.kernel()\nprint(f"Optimized Energy: {mf.e_tot()}")`
    : `mf = scf.RHF(mol)\nmf.kernel()\nhessian = mf.Hessian().kernel()\nprint(f"Frequency analysis done")`;

  const script = `#!/usr/bin/env python3
"""PySCF quantum chemistry calculation — auto-generated."""
from rdkit import Chem
from rdkit.Chem import AllChem
from pyscf import gto, scf
from pyscf.geomopt import optimizeOptimizer
import numpy as np

# Build molecule
${molBlock}
conf = mol.GetConformer()
coords = np.array([[atom.x, atom.y, atom.z] for atom in mol.GetAtoms()])
atoms = [(mol.GetAtomWithIdx(i).GetSymbol(), coords[i]) for i in range(mol.GetNumAtoms())]

# Build PySCF mol
mol_pyscf = gto.M(atom=atoms, basis="${basis_set}", charge=${charge}, spin=${spin})
print(f"Atoms: {mol_pyscf.natm}, Electrons: {mol_pyscf.nelectron}")

# Calculation
${calcBlock}
`;

  return {
    energy: 0,
    optimized_geometry: calculation_type === 'opt' ? 'Run script to get geometry' : undefined,
    molecular_orbitals: calculation_type === 'scf' ? { homo: 0, lumo: 0, gap: 0 } : undefined,
    frequencies: calculation_type === 'freq' ? [] : undefined,
    script,
  };
}
