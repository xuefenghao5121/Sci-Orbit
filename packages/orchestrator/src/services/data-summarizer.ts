/**
 * AI4S 科学数据格式摘要服务
 * 将科学数据文件转换为 LLM 可理解的文本摘要
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

/** 摘要结果 */
interface DataSummary {
  file: string;
  format: string;
  size_bytes: number;
  summary: string;         // 人类可读摘要（核心输出）
  key_fields: Record<string, any>;  // 提取的关键字段
  confidence: number;      // 解析置信度 0-1
  warnings: string[];
}

/** 格式解析器接口 */
interface FormatParser {
  format: string;
  extensions: string[];
  parse(content: string, filename: string): Partial<DataSummary>;
}

/** POSCAR 解析器 */
class PoscarParser implements FormatParser {
  format = 'POSCAR';
  extensions = ['POSCAR', 'CONTCAR'];

  parse(content: string, filename: string): Partial<DataSummary> {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) return { summary: 'Invalid POSCAR file', confidence: 0 };

      const system = lines[0].trim();
      const scale = parseFloat(lines[1]);
      const a = parseFloat(lines[2].split(/\s+/)[0]) * scale;
      const atomCounts = lines[5].trim().split(/\s+/).map(Number);
      const totalAtoms = atomCounts.reduce((a, b) => a + b, 0);
      const coordType = lines[7]?.trim() || 'unknown';

      // 尝试检测晶体类型
      let structure = 'unknown';
      const latticeVectors = [lines[2], lines[3], lines[4]].map(l => l.trim().split(/\s+/).slice(0, 3).map(Number));
      const angles = this.calcAngles(latticeVectors);
      if (angles.every(a => Math.abs(a - 60) < 2 || Math.abs(a - 90) < 2 || Math.abs(a - 109.47) < 2)) {
        if (totalAtoms <= 4) structure = 'FCC-like (possibly)';
        else if (totalAtoms === 2) structure = 'BCC-like (possibly)';
      }

      return {
        format: 'POSCAR',
        summary: `${system}: ${totalAtoms} atoms, lattice parameter a≈${a.toFixed(3)}Å, coordinate type: ${coordType}, structure hint: ${structure}`,
        key_fields: { system, scale, lattice_a_angstrom: a, total_atoms: totalAtoms, atom_counts: atomCounts, coord_type: coordType },
        confidence: 0.85,
      };
    } catch (error) {
      return { summary: 'Failed to parse POSCAR file', confidence: 0, warnings: [String(error)] };
    }
  }

  private calcAngles(vectors: number[][]): number[] {
    // 计算晶格向量之间的夹角（简化版）
    const angles: number[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const dot = vectors[i].reduce((s, v, k) => s + v * vectors[j][k], 0);
        const mag_i = Math.sqrt(vectors[i].reduce((s, v) => s + v * v, 0));
        const mag_j = Math.sqrt(vectors[j].reduce((s, v) => s + v * v, 0));
        angles.push(Math.acos(dot / (mag_i * mag_j)) * 180 / Math.PI);
      }
    }
    return angles;
  }
}

/** CIF 解析器 */
class CifParser implements FormatParser {
  format = 'CIF';
  extensions = ['cif'];

  parse(content: string, filename: string): Partial<DataSummary> {
    try {
      const fields: Record<string, any> = {};
      const warnings: string[] = [];

      // 提取常见 CIF 字段
      const extractField = (pattern: string): string | undefined => {
        const match = content.match(new RegExp(pattern, 'i'));
        return match?.[1]?.trim();
      };

      fields.chemical_formula = extractField(`_chemical_formula_sum\\s+'(.+?)'`) || extractField(`_chemical_formula_sum\\s+(.+)`);
      fields.space_group = extractField(`_symmetry_space_group_name_H-M\\s+'(.+?)'`) || extractField(`_symmetry_space_group_name_H-M\\s+(.+)`);
      fields.cell_a = extractField(`_cell_length_a\\s+([\\d.]+)`);
      fields.cell_b = extractField(`_cell_length_b\\s+([\\d.]+)`);
      fields.cell_c = extractField(`_cell_length_c\\s+([\\d.]+)`);
      fields.cell_alpha = extractField(`_cell_angle_alpha\\s+([\\d.]+)`);
      fields.cell_beta = extractField(`_cell_angle_beta\\s+([\\d.]+)`);
      fields.cell_gamma = extractField(`_cell_angle_gamma\\s+([\\d.]+)`);

      if (!fields.chemical_formula) warnings.push('Could not extract chemical formula');

      const parts = [fields.chemical_formula || 'Unknown material'];
      if (fields.space_group) parts.push(`space group ${fields.space_group}`);
      if (fields.cell_a) parts.push(`a=${fields.cell_a}Å`);
      if (fields.cell_b) parts.push(`b=${fields.cell_b}Å`);
      if (fields.cell_c) parts.push(`c=${fields.cell_c}Å`);

      return {
        format: 'CIF',
        summary: parts.join(', '),
        key_fields: fields,
        confidence: fields.chemical_formula ? 0.8 : 0.4,
        warnings,
      };
    } catch (error) {
      return { summary: 'Failed to parse CIF file', confidence: 0, warnings: [String(error)] };
    }
  }
}

/** VASP OUTCAR 解析器 */
class OutcarParser implements FormatParser {
  format = 'VASP_OUTCAR';
  extensions = ['OUTCAR', 'outcar'];

  parse(content: string, filename: string): Partial<DataSummary> {
    try {
      const fields: Record<string, any> = {};

      // 提取关键信息
      const extractAfter = (pattern: string | RegExp): string | undefined => {
        const match = content.match(pattern);
        return match?.[1]?.trim();
      };

      fields.system = extractAfter(/SYSTEM\s*=\s*(.+)/);
      fields.potcar = extractAfter(/POTCAR:\s*(.+)/);
      fields.encut = extractAfter(/ENCUT\s*=\s*([\d.]+)/);
      fields.ediff = extractAfter(/EDIFF\s*=\s*([e\d.+-]+)/);
      fields.kpoints = extractAfter(/k-points\s*:\s*(.+)/i);
      fields.total_energy = extractAfter(/energy\(sigma->0\)\s*=\s*([+-]?\d+\.\d+)/);
      fields.final_energy = extractAfter(/free energy\s+TOTEN\s*=\s*([+-]?\d+\.\d+)/);
      fields.ionic_steps = extractAfter(/ionic-step:\s*(\d+)/);
      fields.converged = content.includes('reached required accuracy') || content.includes('EDIFF');

      // 提取力信息
      const maxForce = extractAfter(/maximum force\s*=\s*([+-]?\d+\.\d+)/);
      if (maxForce) fields.max_force = maxForce;

      const parts = [];
      if (fields.system) parts.push(fields.system);
      if (fields.final_energy) parts.push(`E₀=${fields.final_energy} eV`);
      if (fields.encut) parts.push(`ENCUT=${fields.encut} eV`);
      if (fields.max_force) parts.push(`max force=${fields.max_force} eV/Å`);
      if (fields.converged) parts.push('✅ converged');
      else parts.push('⚠️ not converged');

      return {
        format: 'VASP_OUTCAR',
        summary: parts.join(', '),
        key_fields: fields,
        confidence: fields.final_energy ? 0.9 : 0.5,
        warnings: fields.converged ? [] : ['Calculation may not have converged'],
      };
    } catch (error) {
      return { summary: 'Failed to parse OUTCAR file', confidence: 0, warnings: [String(error)] };
    }
  }
}

/** XYZ 解析器 */
class XyzParser implements FormatParser {
  format = 'XYZ';
  extensions = ['xyz'];

  parse(content: string, filename: string): Partial<DataSummary> {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 3) return { summary: 'Invalid XYZ file', confidence: 0 };

      const atomCount = parseInt(lines[0]);
      const comment = lines[1].trim();
      const atoms = lines.slice(2, 2 + atomCount);

      // 统计元素
      const elementCounts: Record<string, number> = {};
      for (const line of atoms) {
        const element = line.trim().split(/\s+/)[0];
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      }
      const formula = Object.entries(elementCounts).map(([e, c]) => c > 1 ? `${e}${c}` : e).join('');

      return {
        format: 'XYZ',
        summary: `${formula}, ${atomCount} atoms${comment ? ', comment: ' + comment : ''}`,
        key_fields: { atom_count: atomCount, elements: elementCounts, formula, comment },
        confidence: 0.95,
      };
    } catch (error) {
      return { summary: 'Failed to parse XYZ file', confidence: 0, warnings: [String(error)] };
    }
  }
}

/** ABACUS 输出日志解析器 */
class AbacusLogParser implements FormatParser {
  format = 'ABACUS_LOG';
  extensions = ['running_xxx.log', 'running.log'];

  parse(content: string, filename: string): Partial<DataSummary> {
    try {
      const fields: Record<string, any> = {};

      const extract = (pattern: string | RegExp): string | undefined => {
        const match = content.match(pattern);
        return match?.[1]?.trim();
      };

      fields.final_energy = extract(/FINAL_ETOT_IS\s*([+-]?\d+\.\d+)/);
      fields.total_energy = extract(/ETOT\s*=\s*([+-]?\d+\.\d+)/);
      fields.scf_converged = content.includes('convergence has been achieved') || content.includes('SCF converged');
      fields.fermi_energy = extract(/E_FERMI\s*=\s*([+-]?\d+\.\d+)/);
      fields.basis_type = extract(/basis_type\s*:\s*(\w+)/);
      fields.ecutwfc = extract(/ecutwfc\s*=\s*([\d.]+)/);

      const parts = [];
      if (fields.final_energy) parts.push(`E₀=${fields.final_energy} eV`);
      if (fields.fermi_energy) parts.push(`E_Fermi=${fields.fermi_energy} eV`);
      if (fields.basis_type) parts.push(`basis: ${fields.basis_type}`);
      if (fields.ecutwfc) parts.push(`ecutwfc=${fields.ecutwfc} Ry`);
      if (fields.scf_converged) parts.push('✅ SCF converged');
      else parts.push('⚠️ SCF not converged');

      return {
        format: 'ABACUS_LOG',
        summary: parts.join(', ') || 'ABACUS output log',
        key_fields: fields,
        confidence: fields.final_energy ? 0.85 : 0.4,
      };
    } catch (error) {
      return { summary: 'Failed to parse ABACUS log file', confidence: 0, warnings: [String(error)] };
    }
  }
}

/** JSON/YAML 通用解析器 */
class JsonYamlParser implements FormatParser {
  format = 'JSON/YAML';
  extensions = ['json', 'yaml', 'yml'];

  parse(content: string, filename: string): Partial<DataSummary> {
    try {
      const ext = extname(filename).toLowerCase();
      if (ext === '.json') {
        const data = JSON.parse(content);
        const keys = Object.keys(data);
        return {
          format: 'JSON',
          summary: `JSON object with ${keys.length} top-level keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`,
          key_fields: { top_level_keys: keys, entry_count: keys.length },
          confidence: 0.95,
        };
      }
      // YAML - basic parsing
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const topLevelKeys = lines.filter(l => /^[a-zA-Z]/.test(l) && l.includes(':')).map(l => l.split(':')[0].trim());
      return {
        format: 'YAML',
        summary: `YAML config with ${topLevelKeys.length} top-level keys: ${topLevelKeys.slice(0, 10).join(', ')}`,
        key_fields: { top_level_keys: topLevelKeys },
        confidence: 0.8,
      };
    } catch (error) {
      return { summary: 'Could not parse JSON/YAML', confidence: 0.1, warnings: [String(error)] };
    }
  }
}

export class DataSummarizerService {
  private parsers: FormatParser[];

  constructor() {
    this.parsers = [
      new PoscarParser(),
      new CifParser(),
      new OutcarParser(),
      new XyzParser(),
      new AbacusLogParser(),
      new JsonYamlParser(),
    ];
  }

  /** 自动检测格式并生成摘要 */
  summarize(filePath: string): DataSummary {
    if (!existsSync(filePath)) {
      return { file: filePath, format: 'unknown', size_bytes: 0, summary: 'File not found', key_fields: {}, confidence: 0, warnings: ['File not found'] };
    }

    const content = readFileSync(filePath, 'utf8');
    const filename = basename(filePath);
    const ext = extname(filename).toLowerCase().slice(1);
    const size = statSync(filePath).size;

    // 大文件警告
    const warnings: string[] = [];
    if (size > 100 * 1024 * 1024) {
      warnings.push(`File is ${(size / 1024 / 1024).toFixed(1)}MB, only first 1MB will be parsed`);
    }

    const truncatedContent = content.slice(0, 1 * 1024 * 1024);

    // 按扩展名找解析器
    let parser = this.parsers.find(p => p.extensions.includes(ext) || p.extensions.includes(filename));

    // 按内容特征匹配
    if (!parser) {
      if (content.includes('SELECTIVE DYNAMICS') || /^\s*\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+/m.test(content)) {
        parser = this.parsers.find(p => p.format === 'POSCAR');
      } else if (content.includes('_cell_length_a') || content.includes('data_')) {
        parser = this.parsers.find(p => p.format === 'CIF');
      } else if (content.includes('VASP') || content.includes('EDIFF')) {
        parser = this.parsers.find(p => p.format === 'VASP_OUTCAR');
      } else if (content.includes('FINAL_ETOT_IS') || content.includes('ABACUS')) {
        parser = this.parsers.find(p => p.format === 'ABACUS_LOG');
      }
    }

    if (!parser) {
      return {
        file: filePath, format: 'unknown', size_bytes: size,
        summary: `File "${filename}" (${(size / 1024).toFixed(1)}KB) - format not recognized. Supported: POSCAR, CIF, OUTCAR, XYZ, ABACUS log, JSON, YAML`,
        key_fields: { filename, size_kb: Math.round(size / 1024), extension: ext },
        confidence: 0.1,
        warnings: [...warnings, 'Format not recognized'],
      };
    }

    const result = parser.parse(truncatedContent, filename);
    return {
      file: filePath,
      format: result.format || parser.format,
      size_bytes: size,
      summary: result.summary || '',
      key_fields: result.key_fields || {},
      confidence: result.confidence || 0,
      warnings: [...(result.warnings || []), ...warnings],
    };
  }

  /** 批量摘要目录下所有文件 */
  summarizeDirectory(dirPath: string): DataSummary[] {
    if (!existsSync(dirPath)) return [];

    const results: DataSummary[] = [];
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      if (statSync(fullPath).isFile()) {
        const summary = this.summarize(fullPath);
        if (summary.format !== 'unknown') {
          results.push(summary);
        }
      }
    }

    return results;
  }

  /** 列出支持的格式 */
  supportedFormats(): Array<{ format: string; extensions: string[] }> {
    return this.parsers.map(p => ({ format: p.format, extensions: p.extensions }));
  }
}
