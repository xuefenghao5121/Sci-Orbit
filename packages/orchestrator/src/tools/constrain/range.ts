import type { CheckRangeInput, CheckRangeOutput } from './schemas.js';

const TYPICAL_RANGES: Record<string, Record<string, { min: number; max: number; unit: string; description: string }>> = {
  fluid: {
    density: { min: 0.1, max: 13600, unit: 'kg/m³', description: 'Typical fluid density range' },
    viscosity: { min: 1e-6, max: 1e6, unit: 'Pa·s', description: 'Dynamic viscosity range' },
    velocity: { min: 0, max: 1000, unit: 'm/s', description: 'Flow velocity range' },
    pressure: { min: 0, max: 1e9, unit: 'Pa', description: 'Pressure range' },
    temperature: { min: 50, max: 5000, unit: 'K', description: 'Temperature range' },
    reynolds: { min: 0, max: 1e8, unit: '', description: 'Reynolds number range' },
  },
  material: {
    youngs_modulus: { min: 1e6, max: 1e12, unit: 'Pa', description: "Young's modulus range" },
    yield_strength: { min: 1e4, max: 1e10, unit: 'Pa', description: 'Yield strength range' },
    poisson_ratio: { min: 0, max: 0.5, unit: '', description: "Poisson's ratio range" },
    density: { min: 100, max: 23000, unit: 'kg/m³', description: 'Material density range' },
    thermal_conductivity: { min: 0.01, max: 2000, unit: 'W/(m·K)', description: 'Thermal conductivity range' },
  },
  chemistry: {
    concentration: { min: 1e-10, max: 55, unit: 'mol/L', description: 'Concentration range' },
    ph: { min: 0, max: 14, unit: '', description: 'pH range' },
    temperature: { min: 100, max: 5000, unit: 'K', description: 'Reaction temperature range' },
    activation_energy: { min: 1e3, max: 5e5, unit: 'J/mol', description: 'Activation energy range' },
    bond_length: { min: 0.5, max: 4, unit: 'Å', description: 'Bond length range' },
  },
};

export async function checkRange(input: CheckRangeInput): Promise<CheckRangeOutput> {
  const { values, domain, property } = input;
  const range = TYPICAL_RANGES[domain]?.[property];

  if (!range) {
    return {
      in_range: false,
      warnings: [`No typical range defined for ${domain}/${property}`],
      typical_ranges: { min: 0, max: 0, unit: 'unknown', description: 'Not defined' },
    };
  }

  const warnings: string[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] < range.min) warnings.push(`Value ${values[i]} at index ${i} is below typical minimum ${range.min} ${range.unit}`);
    if (values[i] > range.max) warnings.push(`Value ${values[i]} at index ${i} exceeds typical maximum ${range.max} ${range.unit}`);
  }

  return {
    in_range: warnings.length === 0,
    warnings,
    typical_ranges: range,
  };
}
