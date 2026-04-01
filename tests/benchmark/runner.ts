import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';

interface TestCase {
  id: string;
  name: string;
  category: string;
  scoring: Array<{ criterion: string; weight: number }>;
}

function loadCases(): TestCase[] {
  const content = readFileSync('./test_cases.yaml', 'utf8');
  const data = yaml.load(content) as any;
  return data.test_cases;
}

async function main() {
  console.log('🚀 Sci-Orbit Deployment Verification\n');
  
  const cases = loadCases();
  console.log(`Loaded ${cases.length} test cases:`);
  
  for (const tc of cases) {
    const maxScore = tc.scoring.reduce((s, c) => s + c.weight, 0);
    console.log(`  ${tc.id} [${tc.category}] ${tc.name} (${maxScore} pts)`);
  }
  
  console.log('\n✅ Test infrastructure ready for deployment validation');
}

main().catch(e => { console.error(e); process.exit(1); });
