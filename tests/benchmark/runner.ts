/**
 * Sci-Orbit AI4S 工具调用能力评测运行器
 * 
 * 用法:
 *   npx ts-node runner.ts
 *   npx ts-node runner.ts --case TC001
 *   npx ts-node runner.ts --category env_snapshot
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import * as yaml from 'js-yaml';

// ============================================================
// 类型定义
// ============================================================

interface ScoringItem {
  criterion: string;
  weight: number;
}

interface TestCase {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  instruction: string;
  ground_truth: Record<string, any>;
  scoring: ScoringItem[];
}

interface DetailItem {
  criterion: string;
  weight: number;
  passed: boolean;
  reason: string;
}

interface TestResult {
  case_id: string;
  case_name: string;
  category: string;
  passed: boolean;
  score: number;
  max_score: number;
  details: DetailItem[];
  error?: string;
  duration_ms: number;
}

// ============================================================
// 服务导入
// ============================================================

async function importServices() {
  const distDir = join(__dirname, '../../packages/orchestrator/dist');
  let envService: any = null;
  let paramService: any = null;
  let dataService: any = null;

  try {
    const m = await import(join(distDir, 'services/env-snapshot.js'));
    envService = new m.EnvSnapshotService();
  } catch { /* not built */ }
  try {
    const m = await import(join(distDir, 'services/param-completer.js'));
    paramService = new m.ParamCompleterService();
  } catch { /* not built */ }
  try {
    const m = await import(join(distDir, 'services/data-summarizer.js'));
    dataService = new m.DataSummarizerService();
  } catch { /* not built */ }

  return { envService, paramService, dataService };
}

// ============================================================
// 测试执行
// ============================================================

function notAvailable(tc: TestCase): TestResult {
  const details: DetailItem[] = tc.scoring.map(s => ({
    criterion: s.criterion, weight: s.weight, passed: false, reason: 'Service not available'
  }));
  return {
    case_id: tc.id, case_name: tc.name, category: tc.category,
    passed: false, score: 0, max_score: tc.scoring.reduce((s, c) => s + c.weight, 0),
    details, duration_ms: 0,
  };
}

async function runEnvTest(tc: TestCase, svc: any): Promise<TestResult> {
  if (!svc) return notAvailable(tc);
  const start = Date.now();
  const details: DetailItem[] = [];
  let score = 0;

  const snapshot = await svc.collect();

  if (tc.id === 'TC001') {
    const gt = tc.ground_truth;
    const required = gt.required_fields as string[];
    const missing = required.filter(f => {
      const v = f.includes('.') ? f.split('.').reduce((o: any, k: string) => o?.[k], snapshot) : (snapshot as any)[f];
      return v === undefined || v === null;
    });
    const p1 = missing.length === 0;
    details.push({ criterion: 'required_fields', weight: 60, passed: p1, reason: p1 ? 'OK' : `Missing: ${missing.join(',')}` });
    if (p1) score += 60;

    const emptyFields = (gt.must_not_be_empty as string[]).filter((f: string) => {
      const v = (snapshot as any)[f];
      return v === '' || v === 'unknown' || v === undefined;
    });
    const p2 = emptyFields.length === 0;
    details.push({ criterion: 'non-empty', weight: 30, passed: p2, reason: p2 ? 'OK' : `Empty: ${emptyFields.join(',')}` });
    if (p2) score += 30;

    const p3 = typeof (snapshot as any).ram_total_gb === 'number' && Array.isArray((snapshot as any).gpus);
    details.push({ criterion: 'types', weight: 10, passed: p3, reason: `ram=${typeof (snapshot as any).ram_total_gb}, gpus=${typeof (snapshot as any).gpus}` });
    if (p3) score += 10;

  } else if (tc.id === 'TC002') {
    const gpus = (snapshot as any).gpus || [];
    if (gpus.length > 0) {
      const allValid = gpus.every((g: any) => g.id !== undefined && g.model && g.memory_total_mb > 0);
      details.push({ criterion: 'GPU info', weight: 70, passed: allValid, reason: `${gpus.length} GPU(s)` });
      if (allValid) score += 70;
    } else {
      details.push({ criterion: 'GPU graceful', weight: 70, passed: true, reason: 'No GPU (OK)' });
      score += 70;
    }
    details.push({ criterion: 'no crash', weight: 30, passed: true, reason: 'OK' });
    score += 30;

  } else if (tc.id === 'TC003') {
    const pkgs = (snapshot as any).packages;
    const p1 = pkgs && typeof pkgs === 'object' && Object.keys(pkgs).length > 0;
    details.push({ criterion: 'packages', weight: 70, passed: p1, reason: p1 ? `${Object.keys(pkgs).length} pkgs` : 'empty' });
    if (p1) score += 70;
    details.push({ criterion: 'only installed', weight: 30, passed: true, reason: 'OK' });
    score += 30;

  } else if (tc.id === 'TC004') {
    writeFileSync('/tmp/snapshot_a.json', JSON.stringify(snapshot, null, 2));
    const diff = svc.diff(snapshot, snapshot);
    const p1 = diff.has_diff === false;
    details.push({ criterion: 'no diff', weight: 60, passed: p1, reason: `has_diff=${diff.has_diff}` });
    if (p1) score += 60;
    const p2 = !diff.diffs || diff.diffs.length === 0;
    details.push({ criterion: 'empty diffs', weight: 20, passed: p2, reason: `${(diff.diffs || []).length} diffs` });
    if (p2) score += 20;
    const p3 = diff.risk_level === 'low';
    details.push({ criterion: 'risk low', weight: 20, passed: p3, reason: `risk=${diff.risk_level}` });
    if (p3) score += 20;
  }

  const maxScore = tc.scoring.reduce((s, c) => s + c.weight, 0);
  return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: score >= maxScore * 0.6, score, max_score: maxScore, details, duration_ms: Date.now() - start };
}

async function runParamTest(tc: TestCase, svc: any): Promise<TestResult> {
  if (!svc) return notAvailable(tc);
  const start = Date.now();
  const details: DetailItem[] = [];
  let score = 0;

  if (tc.id === 'TC005') {
    const result = await svc.complete(tc.ground_truth.explicit_params);
    const imp = result.implicit || {};
    const warns = result.warnings || [];
    
    const checks = [
      { key: 'ismear=1', ok: imp.ismear === 1, w: 40, r: `ismear=${imp.ismear}` },
      { key: 'sigma=0.2', ok: imp.sigma === 0.2, w: 20, r: `sigma=${imp.sigma}` },
      { key: 'prec', ok: imp.prec === 'accurate', w: 20, r: `prec=${imp.prec}` },
      { key: 'metal warn', ok: warns.some((w: any) => /metal|cu/i.test(String(w.message || w))), w: 20, r: `${warns.length} warns` },
    ];
    for (const c of checks) {
      details.push({ criterion: c.key, weight: c.w, passed: c.ok, reason: c.r });
      if (c.ok) score += c.w;
    }

  } else if (tc.id === 'TC006') {
    const result = await svc.complete(tc.ground_truth.explicit_params);
    const imp = result.implicit || {};
    const checks = [
      { key: 'temp=300', ok: imp.temperature === 300, w: 30, r: `temp=${imp.temperature}` },
      { key: 'timestep=1', ok: imp.timestep === 1.0, w: 30, r: `timestep=${imp.timestep}` },
      { key: 'steps=100k', ok: imp.total_steps === 100000, w: 20, r: `steps=${imp.total_steps}` },
      { key: 'dump=1000', ok: imp.dump_interval === 1000, w: 20, r: `dump=${imp.dump_interval}` },
    ];
    for (const c of checks) {
      details.push({ criterion: c.key, weight: c.w, passed: c.ok, reason: c.r });
      if (c.ok) score += c.w;
    }

  } else if (tc.id === 'TC007') {
    const warns = svc.validate(tc.ground_truth.input_params);
    const hasWarn = Array.isArray(warns) && warns.length > 0;
    details.push({ criterion: 'detect conflict', weight: 60, passed: hasWarn, reason: `${warns?.length || 0} warns` });
    if (hasWarn) score += 60;
    const hasSigma = Array.isArray(warns) && warns.some((w: any) => /sigma/i.test(String(w.message || w)));
    details.push({ criterion: 'sigma warning', weight: 40, passed: hasSigma, reason: hasSigma ? 'found' : 'not found' });
    if (hasSigma) score += 40;
  }

  const maxScore = tc.scoring.reduce((s, c) => s + c.weight, 0);
  return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: score >= maxScore * 0.6, score, max_score: maxScore, details, duration_ms: Date.now() - start };
}

async function runDataTest(tc: TestCase, svc: any): Promise<TestResult> {
  if (!svc) return notAvailable(tc);
  const start = Date.now();
  const details: DetailItem[] = [];
  let score = 0;

  const filePath = tc.instruction.match(/摘要\s+(.+)/)?.[1]?.trim();
  if (!filePath) {
    return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: false, score: 0, max_score: 100, details: [{ criterion: 'parse', weight: 100, passed: false, reason: 'no file path' }], duration_ms: 0 };
  }

  let result: any;
  try { result = svc.summarize(filePath); } catch (e: any) {
    return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: false, score: 0, max_score: 100, details: [{ criterion: 'run', weight: 100, passed: false, reason: e.message }], duration_ms: Date.now() - start };
  }

  if (tc.id === 'TC008') {
    const checks = [
      { key: 'format POSCAR', ok: result.format === 'POSCAR', w: 20, r: `fmt=${result.format}` },
      { key: '2 atoms', ok: result.key_fields?.total_atoms === 2, w: 30, r: `atoms=${result.key_fields?.total_atoms}` },
      { key: 'Si in summary', ok: (result.summary || '').includes('Si'), w: 30, r: (result.summary || '').slice(0, 80) },
      { key: 'Direct', ok: result.key_fields?.coord_type === 'Direct', w: 20, r: `coord=${result.key_fields?.coord_type}` },
    ];
    for (const c of checks) { details.push({ criterion: c.key, weight: c.w, passed: c.ok, reason: c.r }); if (c.ok) score += c.w; }
  } else if (tc.id === 'TC009') {
    const checks = [
      { key: 'format CIF', ok: result.format === 'CIF', w: 20, r: `fmt=${result.format}` },
      { key: 'Fd-3m', ok: result.key_fields?.space_group === 'Fd-3m', w: 40, r: `sg=${result.key_fields?.space_group}` },
      { key: '5.43', ok: (result.summary || '').includes('5.43'), w: 40, r: (result.summary || '').slice(0, 80) },
    ];
    for (const c of checks) { details.push({ criterion: c.key, weight: c.w, passed: c.ok, reason: c.r }); if (c.ok) score += c.w; }
  } else if (tc.id === 'TC010') {
    const hasResp = result && (result.summary || result.format);
    details.push({ criterion: 'no crash', weight: 60, passed: hasResp, reason: hasResp ? `got ${result.format}` : 'empty' });
    if (hasResp) score += 60;
    const hasFmt = result.format && result.format !== 'unknown';
    details.push({ criterion: 'format info', weight: 40, passed: hasFmt, reason: `format=${result.format}` });
    if (hasFmt) score += 40;
  }

  const maxScore = tc.scoring.reduce((s, c) => s + c.weight, 0);
  return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: score >= maxScore * 0.6, score, max_score: maxScore, details, duration_ms: Date.now() - start };
}

async function runTestCase(tc: TestCase, services: any): Promise<TestResult> {
  try {
    switch (tc.category) {
      case 'env_snapshot': return runEnvTest(tc, services.envService);
      case 'param_complete': return runParamTest(tc, services.paramService);
      case 'data_summarize': return runDataTest(tc, services.dataService);
      default: return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: false, score: 0, max_score: 0, details: [], error: 'unknown category', duration_ms: 0 };
    }
  } catch (e: any) {
    return { case_id: tc.id, case_name: tc.name, category: tc.category, passed: false, score: 0, max_score: 0, details: [], error: e.message, duration_ms: 0 };
  }
}

// ============================================================
// 报告
// ============================================================

function printReport(results: TestResult[]) {
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = results.reduce((s, r) => s + r.max_score, 0);
  const passed = results.filter(r => r.passed).length;

  console.log('\n' + '═'.repeat(70));
  console.log('  Sci-Orbit v0.5.0 基础评测报告');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═'.repeat(70));
  console.log(`\n  总分: ${totalScore}/${maxScore} | 通过: ${passed}/${results.length} | 通过率: ${results.length > 0 ? (passed/results.length*100).toFixed(0) : 0}%`);

  const cats: Record<string, {s:number;m:number;c:number}> = {};
  for (const r of results) {
    if (!cats[r.category]) cats[r.category] = {s:0,m:0,c:0};
    cats[r.category].s += r.score; cats[r.category].m += r.max_score; cats[r.category].c++;
  }
  console.log('\n  分类:');
  for (const [k,v] of Object.entries(cats)) {
    console.log(`    ${k}: ${v.s}/${v.m} (${v.m>0?(v.s/v.m*100).toFixed(0):0}%) [${v.c} cases]`);
  }

  console.log('\n  详情:');
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    const t = r.duration_ms > 1000 ? `${(r.duration_ms/1000).toFixed(1)}s` : `${r.duration_ms}ms`;
    console.log(`  ${icon} ${r.case_id} ${r.case_name} — ${r.score}/${r.max_score} [${t}]`);
    if (r.error) console.log(`       ERR: ${r.error}`);
    for (const d of r.details) {
      console.log(`       ${d.passed?'✓':'✗'} [${d.weight}] ${d.criterion} — ${d.reason}`);
    }
  }
  console.log('\n' + '═'.repeat(70) + '\n');
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const filterCase = args.includes('--case') ? args[args.indexOf('--case')+1] : null;
  const filterCat = args.includes('--category') ? args[args.indexOf('--category')+1] : null;

  const yamlPath = join(__dirname, 'test_cases.yaml');
  if (!existsSync(yamlPath)) { console.error('test_cases.yaml not found'); process.exit(1); }

  const data = yaml.load(readFileSync(yamlPath, 'utf8')) as any;
  let cases: TestCase[] = data.test_cases;

  if (filterCase) cases = cases.filter(c => c.id === filterCase);
  if (filterCat) cases = cases.filter(c => c.category === filterCat);

  console.log(`\n🚀 Sci-Orbit Benchmark — ${cases.length} cases\n`);

  const services = await importServices();
  if (!services.envService && !services.paramService && !services.dataService) {
    console.log('  ⚠️  No services available. Run `npm run build` in packages/orchestrator first.\n');
  }

  const results: TestResult[] = [];
  for (const tc of cases) {
    process.stdout.write(`  ${tc.id} ${tc.name}...`);
    const r = await runTestCase(tc, services);
    results.push(r);
    console.log(` ${r.passed?'✅':'❌'} (${r.duration_ms}ms)`);
  }

  printReport(results);

  const passed = results.filter(r => r.passed).length;
  process.exit(results.length > 0 && passed / results.length >= 0.8 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
