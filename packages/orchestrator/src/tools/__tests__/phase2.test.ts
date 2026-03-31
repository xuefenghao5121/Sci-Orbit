import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Debate
import { debateSubmitRuleBased } from '../debate/debate-submit.js';
import { debateRoundRuleBased } from '../debate/debate-round.js';
import { debateResolveRuleBased } from '../debate/debate-resolve.js';

describe('debate', () => {
  it('submit returns debate_id and review', async () => {
    const r = await debateSubmitRuleBased({ plan: 'Step 1: Analyze\nStep 2: Implement\nStep 3: Validate', task_description: 'Test task' });
    assert.ok(r.debate_id.startsWith('debate_'));
    assert.ok(r.initial_review.clarity >= 0);
  });
  it('round returns scores', async () => {
    const r = await debateRoundRuleBased({ debate_id: 'test', role: 'proposer', argument: 'This approach is feasible because benchmarks show 95% accuracy.' });
    assert.ok(r.scores.logical_coherence >= 0);
  });
  it('resolve returns consensus', () => {
    const r = debateResolveRuleBased({ debate_id: 'test', rounds: [{ role: 'proposer', argument: 'good', scores: { logical_coherence: 8 } }, { role: 'critic', argument: 'concerns', scores: { logical_coherence: 6 } }] });
    assert.ok(r.consensus_score >= 0 && r.consensus_score <= 1);
  });
});

// Paper
import { paperParse } from '../paper/paper-parse.js';
import { paperCompare } from '../paper/paper-compare.js';
import { paperImplement } from '../paper/paper-implement.js';

describe('paper', () => {
  it('parse extracts structure', () => {
    const r = paperParse({ content: '# Paper Title\n\nAuthor One, Author Two\n\n## Abstract\nThis paper shows we achieve 95% accuracy.\n\n## Introduction\nWe propose a new method using neural networks.\n\n## Method\nWe use a transformer architecture trained with Adam optimizer. The loss is L = -log(p).' });
    assert.ok(r.title.includes('Paper Title'));
    assert.ok(r.authors.length > 0);
    assert.ok(r.sections.length > 0);
  });
  it('compare two papers', () => {
    const p1 = paperParse({ content: '# Paper A\n\nWe use neural networks for classification.' });
    const p2 = paperParse({ content: '# Paper B\n\nWe use decision trees for classification.' });
    const r = paperCompare({ papers: [p1, p2] });
    assert.ok(r.comparison_table.length === 2);
    assert.ok(r.insights.length > 0);
  });
  it('implement generates starter code', () => {
    const p = paperParse({ content: '# Test Paper\n\nWe use neural networks trained with SGD.' });
    const r = paperImplement({ paper: p, target_framework: 'pytorch' });
    assert.ok(r.starter_code.includes('torch'));
    assert.ok(r.code_structure.length > 0);
  });
});

// Experiment
import { expPlan } from '../experiment/exp-plan.js';
import { expCompare } from '../experiment/exp-compare.js';

describe('experiment', () => {
  it('plan generates phases', () => {
    const r = expPlan({ task: 'Train a model' });
    assert.ok(r.experiment_id.startsWith('exp_'));
    assert.ok(r.phases.length >= 3);
    assert.ok(r.configs.length > 0);
  });
  it('compare finds best config', () => {
    const r = expCompare({ results: [{ config: { lr: '0.001' }, metrics: { accuracy: 0.9, loss: 0.1 } }, { config: { lr: '0.01' }, metrics: { accuracy: 0.8, loss: 0.2 } }] });
    assert.equal(r.best_config.lr, '0.001');
    assert.ok(r.analysis.length > 0);
  });
});

// Env
import { envSetup } from '../env/env-setup.js';

describe('env', () => {
  it('setup generates conda yml', () => {
    const r = envSetup({ requirements: ['numpy', 'torch'], target: 'conda' });
    assert.ok(r.environment_file.includes('name:'));
    assert.ok(r.setup_script.includes('conda'));
  });
  it('setup generates dockerfile', () => {
    const r = envSetup({ requirements: ['numpy', 'torch'], target: 'docker', name: 'test-img' });
    assert.ok(r.environment_file.includes('FROM python'));
    assert.ok(r.setup_script.includes('docker build'));
  });
});

// Knowledge
import { createKb, addEntry, searchEntries, updateEntry, exportKb } from '../knowledge/knowledge-store.js';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('knowledge', () => {
  const testDir = join(process.cwd(), '.ai4s_kb');
  let kbId: string;
  let entryId: string;

  it('create knowledge base', () => {
    const kb = createKb('test', 'ML', 'test kb');
    kbId = kb.kb_id;
    assert.ok(kbId.startsWith('kb_'));
    assert.equal(kb.entries.length, 0);
  });

  it('add and search entries', () => {
    const entry = addEntry(kbId, 'Transformers', 'Transformer architecture uses self-attention mechanism.', ['attention', 'nlp']);
    entryId = entry.id;
    assert.ok(entry.id.startsWith('entry_'));
    const results = searchEntries(kbId, 'transformer attention');
    assert.ok(results.length > 0);
  });

  it('update entry', () => {
    const updated = updateEntry(kbId, entryId, { content: 'Updated content about transformers.' });
    assert.equal(updated.content, 'Updated content about transformers.');
  });

  it('export as jsonl', () => {
    const data = exportKb(kbId, 'jsonl');
    assert.ok(data.split('\n').filter(Boolean).length >= 1);
  });

  it('export as finetune', () => {
    const data = exportKb(kbId, 'finetune');
    assert.ok(data.includes('instruction'));
  });

  // Cleanup
  it.after(() => {
    try { rmSync(testDir, { recursive: true }); } catch {}
  });
});
