import type { ExpRunInput, ExpRunOutput } from './schemas.js';
import { expRunOutput } from './schemas.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export function expRun(input: ExpRunInput): ExpRunOutput {
  const plan = input.experiment_plan as Record<string, unknown>;
  const overrides = input.config_overrides || {};
  const expId = String(plan.experiment_id || 'exp_default');
  const logDir = join(process.cwd(), 'experiments', expId);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, 'run.log');

  const overridesStr = Object.entries(overrides).map(([k, v]) => `    "${k}": "${v}",`).join('\n') || '    # default config';
  const script = [
    '#!/usr/bin/env python3',
    `"""Experiment runner for ${expId}"""`,
    'import json, logging, os',
    `logging.basicConfig(filename="${logFile}", level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")`,
    'log = logging.getLogger(__name__)',
    '',
    'config = {',
    overridesStr,
    '}',
    'log.info("Config: " + str(config))',
    '',
    '# TODO: Implement experiment logic',
    'log.info("Experiment started")',
    'log.info("Experiment completed")',
    '',
  ].join('\n');
  writeFileSync(logFile, `# ${expId} log\n# Generated: ${new Date().toISOString()}\n`);
  writeFileSync(join(logDir, 'run.py'), script);

  return expRunOutput.parse({ run_script: script, log_file: logFile });
}
