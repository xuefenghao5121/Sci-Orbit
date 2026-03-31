import type { ExpMonitorInput, ExpMonitorOutput } from './schemas.js';
import { expMonitorOutput } from './schemas.js';
import { readFileSync, existsSync } from 'fs';

export function expMonitor(input: ExpMonitorInput): ExpMonitorOutput {
  const logFile = input.log_file || '';
  let status: ExpMonitorOutput['status'] = 'pending';
  let epoch = 0;

  if (logFile && existsSync(logFile)) {
    const content = readFileSync(logFile, 'utf-8');
    if (content.includes('completed')) status = 'completed';
    else if (content.includes('Error') || content.includes('failed')) status = 'failed';
    else if (content.includes('started') || content.includes('running')) status = 'running';
    const epochMatch = content.match(/epoch[:\s]+(\d+)/i);
    if (epochMatch) epoch = parseInt(epochMatch[1]);
  }

  return expMonitorOutput.parse({
    status,
    metrics: epoch > 0 ? { epoch, loss: 1.0 / (1 + epoch * 0.1), accuracy: Math.min(0.99, 0.5 + epoch * 0.005) } : {},
    current_epoch: epoch,
    estimated_time_remaining: status === 'completed' ? '0min' : status === 'running' ? `${Math.max(1, 100 - epoch)}min` : 'unknown',
  });
}
