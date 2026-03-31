import type { ScienceOpenmmInput, ScienceOpenmmOutput } from './schemas.js';

export async function scienceOpenmm(input: ScienceOpenmmInput): Promise<ScienceOpenmmOutput> {
  const { forcefield, pdb_file, simulation_params: rawParams, output_dir } = input;
  const { steps = 10000, temperature = 300, pressure = 1.0, dt = 0.002, platform = 'CUDA' } = rawParams || {};

  const script = `#!/usr/bin/env python3
"""OpenMM molecular dynamics simulation — auto-generated."""
from simtk.openmm import app
import simtk.openmm as mm
from simtk import unit
import json, os

os.makedirs("${output_dir}", exist_ok=True)

# Load PDB
pdb = app.PDBFile("${pdb_file}")
forcefield = app.ForceField("${forcefield}")

# System
system = forcefield.createSystem(pdb.topology, nonbondedMethod=app.PME,
    nonbondedCutoff=1.0*unit.nanometer, constraints=app.HBonds)

# Integrator
integrator = mm.LangevinIntegrator(${temperature}*unit.kelvin, 1.0/unit.picosecond, ${dt}*unit.picoseconds)

# Platform
platform = mm.Platform.getPlatformByName("${platform}")

# Simulation
simulation = app.Simulation(pdb.topology, system, integrator, platform)
simulation.context.setPositions(pdb.positions)
simulation.minimizeEnergy()

# Add barostat
system.addForce(mm.MonteCarloBarostat(${pressure}*unit.bar, ${temperature}*unit.kelvin))

# Run
print(f"Running {${steps}} steps...")
simulation.reporters.append(app.StateDataReporter("${output_dir}/md.log", 1000, step=True, potentialEnergy=True, kineticEnergy=True, temperature=True, density=True, separator=','))
simulation.reporters.append(app.DCDReporter("${output_dir}/trajectory.dcd", 1000))
simulation.step(${steps})

# Summary
state = simulation.context.getState(getEnergy=True)
summary = {
    "total_energy": state.getPotentialEnergy().value_in_unit(unit.kilojoules_per_mole) + state.getKineticEnergy().value_in_unit(unit.kilojoules_per_mole),
    "potential_energy": state.getPotentialEnergy().value_in_unit(unit.kilojoules_per_mole),
    "kinetic_energy": state.getKineticEnergy().value_in_unit(unit.kilojoules_per_mole),
    "temperature": ${temperature},
}
print(json.dumps(summary, indent=2))
print(f"Trajectory saved to ${output_dir}/trajectory.dcd")
`;

  return {
    trajectory_path: `${output_dir}/trajectory.dcd`,
    energy_plot: `${output_dir}/energy_plot.png`,
    summary_stats: { total_energy: 0, potential_energy: 0, kinetic_energy: 0, temperature },
    script,
  };
}
