/**
 * Debug association mining
 */

import { EvolutionStorage } from './packages/orchestrator/dist/services/param-evolution/storage.js';
import { AssociationMiner } from './packages/orchestrator/dist/services/param-evolution/association-miner.js';
import path from 'path';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'sci-orbit-debug');

const storage = new EvolutionStorage({ storagePath: testDir });
storage.load();

// Add 13 identical corrections
for (let i = 0; i < 13; i++) {
  storage.addCorrection({
    id: `test-correction-${i}`,
    tool: 'vasp_dft',
    param: 'sigma',
    auto_value: 0.2,
    user_value: 0.15,
    context: { ismear: 1, system: 'Cu' },
    timestamp: new Date().toISOString(),
    templateVersion: 1,
  });
}

console.log(`${storage.getCorrections().length} corrections added`);
console.log('Corrections:');
storage.getCorrections().forEach((c, i) => {
  console.log(`${i+1}. context=${JSON.stringify(c.context)}, param=${c.param}, value=${c.user_value}`);
});

const miner = new AssociationMiner(storage);
const transactions = miner['buildTransactions'](storage.getCorrections());
console.log(`\n${transactions.length} transactions built`);
transactions.forEach((t, i) => {
  console.log(`${i+1}: ${t.map(item => `${item.param}=${item.value}`).join(', ')}`);
});

const frequentItemsets = miner.mineFrequentItemsets(transactions, 0.05);
console.log(`\n${frequentItemsets.length} frequent itemsets found`);
frequentItemsets.forEach((fi, i) => {
  console.log(`${i+1}. support=${fi.support.toFixed(3)} count=${fi.supportCount}: ${fi.itemset.map(item => `${item.param}=${item.value}`).join(', ')}`);
});

const rules = miner.mineRules('vasp_dft');
console.log(`\n${rules.length} rules found`);
rules.forEach((r, i) => {
  console.log(`${i+1}. support=${r.support.toFixed(3)} conf=${r.confidence.toFixed(3)} lift=${r.lift.toFixed(3)}: ${r.antecedent.map(a => `${a.param}=${a.value}`).join(' AND ')} → ${r.consequent.param}=${r.consequent.value}`);
});
