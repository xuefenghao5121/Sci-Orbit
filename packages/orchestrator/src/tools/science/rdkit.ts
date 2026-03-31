import type { ScienceRdkitInput, ScienceRdkitOutput } from './schemas.js';

export async function scienceRdkit(input: ScienceRdkitInput): Promise<ScienceRdkitOutput> {
  const { operation, molecules, fp_type, fp_radius, fp_bits } = input;

  const loadBlock = molecules.map((m, i) =>
    m.format === 'smiles' ? `mols[${i}] = Chem.MolFromSmiles("${m.value}")` : `# Load ${m.format}: ${m.value}`
  ).join('\n');

  const script = `#!/usr/bin/env python3
"""RDKit molecular analysis — auto-generated."""
from rdkit import Chem
from rdkit.Chem import Descriptors, AllChem, DataStructs
import json, numpy as np

mols = [None] * ${molecules.length}
${loadBlock}

results = {}

# Operation: ${operation}
if "${operation}" == "descriptor":
    for i, mol in enumerate(mols):
        if mol:
            results[f"mol_{i}"] = {
                "mw": Descriptors.MolWt(mol),
                "logp": Descriptors.MolLogP(mol),
                "tpsa": Descriptors.TPSA(mol),
                "hbd": Descriptors.NumHDonors(mol),
                "hba": Descriptors.NumHAcceptors(mol),
                "rotatable_bonds": Descriptors.NumRotatableBonds(mol),
            }
elif "${operation}" == "fingerprint":
    fps = []
    for mol in mols:
        if mol:
            fp = AllChem.GetMorganFingerprintAsBitVect(mol, ${fp_radius}, nBits=${fp_bits})
            fps.append(list(fp.ToBitString()))
    results["fingerprints"] = fps
elif "${operation}" == "3d":
    coords = []
    for mol in mols:
        if mol:
            mol = Chem.AddHs(mol)
            AllChem.EmbedMolecule(mol)
            conf = mol.GetConformer()
            coords.append([[a.x, a.y, a.z] for a in mol.GetAtoms()])
    results["coordinates"] = coords
elif "${operation}" == "similarity":
    fps = [AllChem.GetMorganFingerprintAsBitVect(m, ${fp_radius}, nBits=${fp_bits}) for m in mols if m]
    sim = np.zeros((len(fps), len(fps)))
    for i in range(len(fps)):
        for j in range(len(fps)):
            sim[i][j] = DataStructs.TanimotoSimilarity(fps[i], fps[j])
    results["similarity_matrix"] = sim.tolist()

print(json.dumps(results, indent=2))
`;

  return {
    descriptors: operation === 'descriptor' ? [] : undefined,
    fingerprints: operation === 'fingerprint' ? [] : undefined,
    coordinates: operation === '3d' ? [] : undefined,
    similarity_matrix: operation === 'similarity' ? [] : undefined,
    script,
  };
}
