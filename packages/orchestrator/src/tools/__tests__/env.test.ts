/**
 * Environment tools unit tests
 */
import { envDetect } from '../env/env-detect.js';
import { envSetup } from '../env/env-setup.js';

describe('env_detect', () => {
  it('should return environment info with os field', () => {
    const result = envDetect();
    expect(result.os).toBeTruthy();
    expect(result.cpu).toBeDefined();
    expect(typeof result.ram_gb).toBe('number');
  });
});

describe('env_setup', () => {
  it('should generate conda environment.yml', () => {
    const result = envSetup({
      requirements: ['numpy>=1.20', 'torch>=2.0'],
      target: 'conda',
      name: 'test-env',
    });
    expect(result.script).toContain('name: test-env');
    expect(result.script).toContain('numpy');
  });

  it('should generate Dockerfile', () => {
    const result = envSetup({
      requirements: ['python>=3.10'],
      target: 'docker',
      name: 'test',
    });
    expect(result.script).toContain('FROM');
  });
});
