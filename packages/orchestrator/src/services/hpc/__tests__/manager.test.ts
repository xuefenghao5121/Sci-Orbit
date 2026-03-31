import { describe, it, expect } from 'vitest';
import { HPCManager } from '../index.js';
import { LocalAdapter } from '../local-adapter.js';

describe('HPCManager (local)', () => {
  it('should submit a job and get status', async () => {
    const manager = new HPCManager('local');
    expect(manager.getBackend()).toBe('local');

    const jobId = await manager.submitJob({
      name: 'test-echo',
      script: 'echo hello && sleep 0.1',
    });
    expect(jobId).toBeTruthy();
    expect(typeof jobId).toBe('string');

    // Give it a moment
    await new Promise(r => setTimeout(r, 200));

    const status = await manager.getStatus(jobId);
    expect(['completed', 'running', 'failed']).toContain(status);
  });

  it('should list jobs', async () => {
    const manager = new HPCManager('local');
    await manager.submitJob({ name: 'list-test', script: 'echo test' });
    const jobs = await manager.listJobs();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('should get logs', async () => {
    const manager = new HPCManager('local');
    const jobId = await manager.submitJob({ name: 'log-test', script: 'echo log-output' });
    await new Promise(r => setTimeout(r, 200));
    const logs = await manager.getLogs(jobId);
    expect(logs.jobId).toBe(jobId);
    expect(logs.stdout).toContain('log-output');
  });

  it('should cancel a job', async () => {
    const manager = new HPCManager('local');
    const jobId = await manager.submitJob({ name: 'cancel-test', script: 'sleep 30' });
    await new Promise(r => setTimeout(r, 100));
    await manager.cancelJob(jobId);
    const status = await manager.getStatus(jobId);
    expect(status).toBe('cancelled');
  });
});
