/**
 * 测试数据摘要服务
 */
import { DataSummarizerService } from './services/data-summarizer.js';

const service = new DataSummarizerService();

// 测试单个文件
console.log('\n=== 测试 POSCAR 文件 ===');
const poscarResult = service.summarize('./test-fixtures/Si_POSCAR');
console.log(JSON.stringify(poscarResult, null, 2));

console.log('\n=== 测试 CIF 文件 ===');
const cifResult = service.summarize('./test-fixtures/Si.cif');
console.log(JSON.stringify(cifResult, null, 2));

console.log('\n=== 测试 XYZ 文件 ===');
const xyzResult = service.summarize('./test-fixtures/water.xyz');
console.log(JSON.stringify(xyzResult, null, 2));

console.log('\n=== 测试目录扫描 ===');
const dirResults = service.summarizeDirectory('./test-fixtures');
console.log(`找到 ${dirResults.length} 个文件`);
for (const result of dirResults) {
  console.log(`  - ${result.format}: ${result.summary}`);
}

console.log('\n=== 支持的格式 ===');
console.log(JSON.stringify(service.supportedFormats(), null, 2));
