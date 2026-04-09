/**
 * Test script for complete EvoSkills self-evolution flow
 * Simulates: initial completion → user correction → confidence update → verification
 */

import { ParamCompleterService } from './packages/orchestrator/dist/services/param-completer.js';
import { EvolutionStorage } from './packages/orchestrator/dist/services/param-evolution/storage.js';
import { DEFAULT_EVOLUTION_CONFIG } from './packages/orchestrator/dist/services/param-evolution/types.js';

import fs from 'fs';
import path from 'path';
import os from 'os';

// Create temp test storage
const testDir = path.join(os.tmpdir(), 'sci-orbit-test-evoskills');
console.log('=== EvoSkills Self-Evolution Test ===');
console.log('Test storage directory:', testDir);

// Cleanup if exists
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true });
}

const service = new ParamCompleterService({
  storagePath: testDir,
  enableAutoLearning: true,
  beamWidth: 3,
  minConfidenceThreshold: 0.5,
});

console.log('\n✅ Service initialized');

// Step 1: Initial completion for Cu bulk (metal)
console.log('\n=== Step 1: Initial Parameter Completion for Cu bulk ===');
const initialResult = await service.complete({
  tool: 'vasp_dft',
  params: {
    system: 'Cu bulk',
    potcar_path: '/path/to/POTCAR',
    poscar_path: '/path/to/POSCAR',
    encut: 400,
  }
});

console.log('Initial completion result:');
console.log(JSON.stringify(initialResult, null, 2));

// Check what we got
const initialSigma = initialResult.implicit.sigma;
const initialIsmear = initialResult.implicit.ismear;
console.log(`\nAuto-completed: ismear = ${initialIsmear}, sigma = ${initialSigma} (confidence = ${initialResult.confidence.sigma})`);

// Step 2: User finds sigma should be 0.15 instead of 0.2, records correction
console.log('\n=== Step 2: User records correction (sigma should be 0.15 instead of 0.2) ===');
service.recordCorrection(
  'vasp_dft',           // tool
  'sigma',             // param name
  initialSigma,        // auto-generated wrong value
  0.15,               // user corrected value
  {                   // context
    system: 'Cu bulk',
    ismear: initialIsmear,
  }
);

console.log('✅ Correction recorded');

// Check storage to see if correction was saved
const storage = new EvolutionStorage({ storagePath: testDir });
storage.load();
const stats = storage.getStats();
console.log('\nStorage stats after correction:');
console.log(`- Templates: ${stats.templateCount}`);
console.log(`- Corrections: ${stats.correctionCount}`);
console.log(`- Association rules: ${stats.associationCount}`);

// Step 3: Check if confidence was updated
const template = service.dynamicTemplateLibrary.getTemplate('vasp_dft');
console.log('\n=== Step 3: Verify confidence update ===');
console.log(`Template version: ${template.version}`);
console.log(`sigma rule:`);
console.log(`- Default value: ${template.implicit_params.sigma.default_value}`);
console.log(`- Old confidence (initial): 0.8`);
console.log(`- New confidence: ${template.implicit_params.sigma.confidence.toFixed(4)}`);
console.log(`- Sample count: ${template.implicit_params.sigma.sampleCount}`);
console.log(`- Correct count: ${template.implicit_params.sigma.correctCount}`);

// Step 4: Do new completion to see if it learns
console.log('\n=== Step 4: New completion after correction ===');
const newResult = await service.complete({
  tool: 'vasp_dft',
  params: {
    system: 'Cu bulk',
    potcar_path: '/path/to/POTCAR',
    poscar_path: '/path/to/POSCAR',
    encut: 400,
  }
});

console.log('New completion result:');
console.log(`sigma = ${newResult.implicit.sigma} (confidence = ${newResult.confidence.sigma.toFixed(4)})`);

// Check if default value updated
console.log(`\nTemplate sigma default value now: ${template.implicit_params.sigma.default_value}`);

// Step 5: Add more corrections to trigger association mining
console.log('\n=== Step 5: Adding multiple corrections to test association mining ===');
for (let i = 0; i < 12; i++) {
  service.recordCorrection(
    'vasp_dft',
    'sigma',
    0.2,
    0.15,
    { ismear: 1, system: 'Cu' }
  );
}
console.log('Added 12 more corrections for sigma when ismear=1');

const newStats = storage.getStats();
console.log(`Corrections now: ${newStats.correctionCount}`);

// Check if association rules were mined
const rules = service.dynamicTemplateLibrary.getAssociationRules('vasp_dft');
console.log(`Mined association rules: ${rules.length}`);
if (rules.length > 0) {
  console.log('\nTop association rules:');
  rules.slice(0, 3).forEach((rule, idx) => {
    console.log(`${idx+1}. If ${rule.antecedent.map(a => `${a.param}=${a.value}`).join(' AND ')} → ${rule.consequent.param}=${rule.consequent.value}`);
    console.log(`   support: ${rule.support.toFixed(3)}, confidence: ${rule.confidence.toFixed(3)}, lift: ${rule.lift.toFixed(3)}`);
  });
}

// Step 6: Test environment adaptation - check parallel recommendations
console.log('\n=== Step 6: Verify environment adaptation recommendations ===');
// Simulate different environments
const environments = [
  { name: 'Single GPU + 8 cores', gpuCount: 1, cpuCores: 8 },
  { name: 'No GPU + 16 cores', gpuCount: 0, cpuCores: 16 },
  { name: 'No GPU + 64 cores', gpuCount: 0, cpuCores: 64 },
];

const EnvironmentAdapter = (await import('./packages/orchestrator/dist/services/param-evolution/environment-adapter.js')).EnvironmentAdapter;
const adapter = new EnvironmentAdapter();

environments.forEach(env => {
  const rec = adapter.recommendParallel({
    gpuCount: env.gpuCount,
    cpuCores: env.cpuCores,
    mpiAvailable: env.cpuCores > 16,
  });
  console.log(`${env.name} → npar = ${rec.npar}, kpar = ${rec.kpar}, nnodes = ${rec.nnodes}`);
});

// Step 7: API backward compatibility check
console.log('\n=== Step 7: Verify backward compatibility ===');
const oldTemplate = service.findTemplate('vasp_dft');
console.log(`Legacy findTemplate works: ${!!oldTemplate}`);
console.log(`Legacy listTemplates works: ${service.listTemplates().length > 0}`);

console.log('\n=== Test Complete! ===');

// Cleanup
// fs.rmSync(testDir, { recursive: true });
