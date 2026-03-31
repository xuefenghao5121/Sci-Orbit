// Physics dimension tables and conservation law templates

export const SI_DIMENSIONS: Record<string, string> = {
  'm': 'L', 'kg': 'M', 's': 'T', 'K': 'Θ', 'A': 'I', 'mol': 'N', 'cd': 'J',
  'meter': 'L', 'kilogram': 'M', 'second': 'T', 'kelvin': 'Θ', 'ampere': 'I',
  'newton': 'MLT⁻²', 'joule': 'ML²T⁻²', 'watt': 'ML²T⁻³', 'pascal': 'ML⁻¹T⁻²',
  'volt': 'ML²T⁻³I⁻¹', 'hertz': 'T⁻¹', 'coulomb': 'IT', 'ohm': 'ML²T⁻³I⁻²',
  'farad': 'M⁻¹L⁻²T⁴I²', 'tesla': 'MT⁻²I⁻¹', 'weber': 'ML²T⁻²I⁻¹',
  'henry': 'ML²T⁻²I⁻²', 'siemens': 'M⁻¹L⁻²T³I²', 'lumen': 'J',
};

export const DERIVED_QUANTITIES: Record<string, string> = {
  'velocity': 'LT⁻¹', 'speed': 'LT⁻¹',
  'acceleration': 'LT⁻²',
  'force': 'MLT⁻²',
  'energy': 'ML²T⁻²', 'work': 'ML²T⁻²', 'heat': 'ML²T⁻²',
  'power': 'ML²T⁻³',
  'pressure': 'ML⁻¹T⁻²', 'stress': 'ML⁻¹T⁻²',
  'density': 'ML⁻³',
  'momentum': 'MLT⁻¹',
  'angular_momentum': 'ML²T⁻¹',
  'torque': 'ML²T⁻²',
  'frequency': 'T⁻¹',
  'charge': 'IT',
  'electric_field': 'MLT⁻³I⁻¹',
  'magnetic_field': 'MT⁻²I⁻¹',
  'entropy': 'ML²T⁻²Θ⁻¹',
  'viscosity': 'ML⁻¹T⁻¹',
};

export const CONSERVATION_LAWS = [
  {
    name: 'energy',
    description: 'Total energy is conserved in an isolated system',
    check: (data: number[]) => {
      const variance = data.reduce((a, v) => a + (v - data[0]) ** 2, 0) / data.length;
      return variance < 1e-6;
    },
  },
  {
    name: 'mass',
    description: 'Total mass is conserved',
    check: (data: number[]) => {
      const variance = data.reduce((a, v) => a + (v - data[0]) ** 2, 0) / data.length;
      return variance < 1e-6;
    },
  },
  {
    name: 'momentum',
    description: 'Total momentum is conserved in the absence of external forces',
    check: (data: number[]) => {
      const variance = data.reduce((a, v) => a + (v - data[0]) ** 2, 0) / data.length;
      return variance < 1e-6;
    },
  },
];
