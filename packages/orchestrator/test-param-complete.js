/**
 * Simple test script for param-completer
 */
import { ParamCompleterService } from './dist/services/param-completer.js';

async function test() {
  const service = new ParamCompleterService();
  
  console.log('=== Test 1: List Templates ===');
  const templates = service.listTemplates();
  console.log('Supported templates:', JSON.stringify(templates, null, 2));
  
  console.log('\n=== Test 2: VASP Parameter Completion ===');
  const vaspResult = await service.complete({
    tool: 'vasp_dft',
    params: {
      system: 'Cu bulk',
      potcar_path: '/path/to/POTCAR',
      poscar_path: '/path/to/POSCAR'
    }
  });
  console.log('VASP completion result:', JSON.stringify(vaspResult, null, 2));
  
  console.log('\n=== Test 3: LAMMPS Parameter Completion ===');
  const lammpsResult = await service.complete({
    tool: 'lammps_md',
    params: {
      structure_file: '/path/to/structure.lmp',
      potential_file: '/path/to/potential.txt',
      system_type: 'water'
    }
  });
  console.log('LAMMPS completion result:', JSON.stringify(lammpsResult, null, 2));
  
  console.log('\n=== Test 4: Generate INCAR ===');
  const incar = service.generateIncar({
    system: 'Cu bulk',
    encut: 400,
    ismear: 1,
    sigma: 0.2,
    prec: 'accurate'
  });
  console.log('Generated INCAR:\n' + incar);
  
  console.log('\n=== Test 5: Validate Parameters ===');
  const warnings = service.validate({
    tool: 'vasp_dft',
    params: {
      system: 'Test',
      ismear: 0,
      sigma: 0.15 // This should trigger a warning
    }
  });
  console.log('Validation warnings:', JSON.stringify(warnings, null, 2));
}

test().catch(console.error);
