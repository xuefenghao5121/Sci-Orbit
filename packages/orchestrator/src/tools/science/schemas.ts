import { z } from 'zod';

// science_pyscf
export const sciencePyscfInput = z.object({
  calculation_type: z.enum(['scf', 'opt', 'freq']).default('scf'),
  molecule: z.object({
    format: z.enum(['smiles', 'xyz']),
    value: z.string(),
  }),
  basis_set: z.string().default('6-31G*'),
  charge: z.number().default(0),
  spin: z.number().default(0),
  functional: z.string().default('b3lyp'),
});
export const sciencePyscfOutput = z.object({
  energy: z.number(),
  optimized_geometry: z.string().optional(),
  molecular_orbitals: z.object({
    homo: z.number(),
    lumo: z.number(),
    gap: z.number(),
  }).optional(),
  frequencies: z.array(z.number()).optional(),
  script: z.string(),
});
export type SciencePyscfInput = z.infer<typeof sciencePyscfInput>;
export type SciencePyscfOutput = z.infer<typeof sciencePyscfOutput>;

// science_rdkit
export const scienceRdkitInput = z.object({
  operation: z.enum(['descriptor', 'fingerprint', '3d', 'similarity']),
  molecules: z.array(z.object({
    format: z.enum(['smiles', 'sdf', 'mol']),
    value: z.string(),
  })),
  fp_type: z.string().default('morgan'),
  fp_radius: z.number().default(2),
  fp_bits: z.number().default(2048),
});
export const scienceRdkitOutput = z.object({
  descriptors: z.array(z.record(z.string(), z.number())).optional(),
  fingerprints: z.array(z.array(z.number())).optional(),
  coordinates: z.array(z.array(z.number())).optional(),
  similarity_matrix: z.array(z.array(z.number())).optional(),
  script: z.string(),
});
export type ScienceRdkitInput = z.infer<typeof scienceRdkitInput>;
export type ScienceRdkitOutput = z.infer<typeof scienceRdkitOutput>;

// science_openmm
export const scienceOpenmmInput = z.object({
  forcefield: z.string().default('amber14-all.xml'),
  pdb_file: z.string(),
  simulation_params: z.object({
    steps: z.number().default(10000),
    temperature: z.number().default(300),
    pressure: z.number().default(1.0),
    dt: z.number().default(0.002),
    platform: z.string().default('CUDA'),
  }).default(() => ({ steps: 10000, temperature: 300, pressure: 1.0, dt: 0.002, platform: 'CUDA' })),
  output_dir: z.string().default('./md_output'),
});
export const scienceOpenmmOutput = z.object({
  trajectory_path: z.string(),
  energy_plot: z.string().optional(),
  summary_stats: z.object({
    total_energy: z.number(),
    potential_energy: z.number(),
    kinetic_energy: z.number(),
    temperature: z.number(),
    density: z.number().optional(),
  }),
  script: z.string(),
});
export type ScienceOpenmmInput = z.infer<typeof scienceOpenmmInput>;
export type ScienceOpenmmOutput = z.infer<typeof scienceOpenmmOutput>;

// science_jupyter
export const scienceJupyterInput = z.object({
  operation: z.enum(['create', 'run', 'export']),
  notebook_path: z.string(),
  cells: z.array(z.object({
    cell_type: z.enum(['code', 'markdown']),
    source: z.string(),
  })).optional(),
  export_format: z.enum(['html', 'pdf', 'script']).default('html'),
});
export const scienceJupyterOutput = z.object({
  notebook_path: z.string(),
  execution_results: z.array(z.object({
    cell_index: z.number(),
    output: z.string(),
    error: z.string().optional(),
  })).optional(),
  html_export: z.string().optional(),
  script: z.string(),
});
export type ScienceJupyterInput = z.infer<typeof scienceJupyterInput>;
export type ScienceJupyterOutput = z.infer<typeof scienceJupyterOutput>;
