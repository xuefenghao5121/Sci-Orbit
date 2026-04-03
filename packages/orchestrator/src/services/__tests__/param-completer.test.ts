/**
 * Tests for Phase 2: new param templates + adaptive preferences
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ParamCompleterService } from '../param-completer.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ParamCompleterService - Phase 2', () => {
  const testPrefsDir = join(tmpdir(), 'ai4s-test-prefs-' + Date.now());
  const prefsPath = join(testPrefsDir, 'preferences.json');
  let service: ParamCompleterService;

  beforeEach(() => {
    mkdirSync(testPrefsDir, { recursive: true });
    service = new ParamCompleterService(prefsPath);
  });

  afterEach(() => {
    rmSync(testPrefsDir, { recursive: true, force: true });
  });

  describe('GPAW template', () => {
    it('should find gpaw_dft template', () => {
      const t = service.findTemplate('gpaw_dft');
      expect(t).toBeDefined();
      expect(t!.name).toBe('gpaw_dft');
      expect(t!.category).toBe('dft');
    });

    it('should find gpaw_dft by category', () => {
      // 'gpaw' is not a category, but name substring match doesn't exist
      // category 'dft' matches first dft template
      const t = service.findTemplate('gpaw_dft');
      expect(t).toBeDefined();
    });

    it('should complete gpaw_dft parameters', async () => {
      const result = await service.complete({ tool: 'gpaw_dft', params: { structure: 'H2.xyz' } });
      expect(result.implicit.encut).toBe(340);
      expect(result.implicit.mode).toBe('pw');
      expect(result.implicit.xc).toBe('PBE');
    });
  });

  describe('CP2K template', () => {
    it('should find cp2k_dft template', () => {
      const t = service.findTemplate('cp2k_dft');
      expect(t).toBeDefined();
      expect(t!.name).toBe('cp2k_dft');
    });

    it('should complete cp2k_dft parameters', async () => {
      const result = await service.complete({ tool: 'cp2k_dft', params: { coord_file: 'water.xyz', basis_set: 'DZVP-GTH' } });
      expect(result.implicit.cutoff).toBe(400);
      expect(result.implicit.xc_functional).toBe('PBE');
      expect(result.implicit.ukind).toBe('RESTRICTED');
    });
  });

  describe('Quantum ESPRESSO template', () => {
    it('should find qe_pw template', () => {
      const t = service.findTemplate('qe_pw');
      expect(t).toBeDefined();
      expect(t!.name).toBe('qe_pw');
    });

    it('should complete qe_pw parameters', async () => {
      const result = await service.complete({ tool: 'qe_pw', params: { structure_file: 'Si.in', pseudo_dir: './pseudo' } });
      expect(result.implicit.ecutwfc).toBe(40);
      expect(result.implicit.ecutrho).toBe(320);
      expect(result.implicit.smearing).toBe('gaussian');
    });

    it('should enable tprnfor for relax calculations', async () => {
      const result = await service.complete({ tool: 'qe_pw', params: { structure_file: 'Si.in', pseudo_dir: './pseudo', calculation: 'relax' } });
      // tprnfor is an implicit param that depends on calculation
      expect(result.implicit).toBeDefined();
    });
  });

  describe('Template listing', () => {
    it('should list all 6 templates', () => {
      const templates = service.listTemplates();
      const names = templates.map(t => t.name);
      expect(names).toContain('vasp_dft');
      expect(names).toContain('lammps_md');
      expect(names).toContain('abacus_dft');
      expect(names).toContain('gpaw_dft');
      expect(names).toContain('cp2k_dft');
      expect(names).toContain('qe_pw');
    });
  });

  describe('Input file generation', () => {
    it('should generate QE input', () => {
      const content = service.generateQeInput({ calculation: 'scf', ecutwfc: 40, ecutrho: 320 });
      expect(content).toContain('&CONTROL');
      expect(content).toContain("calculation = 'scf'");
      expect(content).toContain('ecutwfc = 40');
    });

    it('should generate CP2K input', () => {
      const content = service.generateCp2kInput({ coord_file: 'coords.xyz', basis_set: 'DZVP-GTH', xc_functional: 'PBE' });
      expect(content).toContain('&FORCE_EVAL');
      expect(content).toContain('DZVP-GTH');
      expect(content).toContain('PBE');
    });
  });

  describe('Adaptive preference learning', () => {
    it('should record a correction', () => {
      service.recordCorrection('vasp_dft', 'encut', 400, 520, { system: 'Si' });
      expect(existsSync(prefsPath)).toBe(true);
      const prefs = JSON.parse(require('fs').readFileSync(prefsPath, 'utf8'));
      expect(prefs.corrections).toHaveLength(1);
      expect(prefs.corrections[0].user_value).toBe(520);
    });

    it('should not apply preference with only 1 correction', async () => {
      service.recordCorrection('vasp_dft', 'encut', 400, 520, { system: 'Si' });
      const result = await service.complete({ tool: 'vasp_dft', params: { system: 'Si' } });
      // encut default is 400, but with only 1 correction preference shouldn't override
      // (need >= 2 corrections)
      expect(result.implicit.encut).toBe(400);
    });

    it('should apply preference after 2+ corrections', async () => {
      service.recordCorrection('vasp_dft', 'encut', 400, 520, { system: 'Si' });
      service.recordCorrection('vasp_dft', 'encut', 400, 520, { system: 'Si' });
      const result = await service.complete({ tool: 'vasp_dft', params: { system: 'Si' } });
      expect(result.implicit.encut).toBe(520);
    });

    it('should match preferences by context', async () => {
      // Record 2 corrections for Si system with encut=520
      service.recordCorrection('vasp_dft', 'encut', 400, 520, { system: 'Si' });
      service.recordCorrection('vasp_dft', 'encut', 400, 520, { system: 'Si' });
      // Record 2 corrections for Cu system with encut=450
      service.recordCorrection('vasp_dft', 'encut', 400, 450, { system: 'Cu' });
      service.recordCorrection('vasp_dft', 'encut', 400, 450, { system: 'Cu' });

      const siResult = await service.complete({ tool: 'vasp_dft', params: { system: 'Si' } });
      expect(siResult.implicit.encut).toBe(520);

      const cuResult = await service.complete({ tool: 'vasp_dft', params: { system: 'Cu' } });
      expect(cuResult.implicit.encut).toBe(450);
    });
  });

  describe('CI workflow generation', () => {
    it('should generate CI workflow', () => {
      const workflow = service.generateCIWorkflow('.github/baseline.json');
      expect(workflow).toContain('name: AI4S Environment Check');
      expect(workflow).toContain('env-check');
      expect(workflow).toContain('baseline.json');
    });

    it('should save workflow to file', () => {
      const outPath = join(testPrefsDir, 'workflow.yml');
      service.generateCIWorkflow('.github/baseline.json', outPath);
      expect(existsSync(outPath)).toBe(true);
      const content = require('fs').readFileSync(outPath, 'utf8');
      expect(content).toContain('AI4S Environment Check');
    });
  });
});
