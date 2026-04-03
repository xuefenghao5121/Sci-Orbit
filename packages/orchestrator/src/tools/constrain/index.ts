/**
 * Constrain Tools — MCP Tool Definitions & Exports
 */
export { checkDimension } from './dimension.js';
export { checkConservation } from './conservation.js';
export { checkRange } from './range.js';
export { checkCode } from './code.js';
export * from './schemas.js';

import { checkDimension } from './dimension.js';
import { checkConservation } from './conservation.js';
import { checkRange } from './range.js';
import { checkCode } from './code.js';
import type { MCPToolDefinition } from '../types.js';
import type { CheckDimensionInput, CheckConservationInput, CheckRangeInput, CheckCodeInput } from './schemas.js';
import { wrapError, AI4SErrorCode } from '../../utils/errors.js';

export const constrainTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'check_dimension',
    description: 'Check dimensional consistency of a physical equation',
    inputSchema: { type: 'object', properties: { equation: { type: 'string', description: 'Physical equation to check' }, variables: { type: 'object', description: 'Variable to dimension mapping' } }, required: ['equation', 'variables'] },
    handler: (i) => {
      try { return checkDimension(i as CheckDimensionInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'check_conservation',
    description: 'Verify conservation law in simulation results (mass/energy/momentum)',
    inputSchema: { type: 'object', properties: { simulation_results: { type: 'array', items: { type: 'object' } }, law: { type: 'string', enum: ['mass', 'energy', 'momentum'] }, tolerance: { type: 'number' } }, required: ['simulation_results', 'law'] },
    handler: (i) => {
      try { return checkConservation(i as CheckConservationInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'check_range',
    description: 'Check if physical values are within reasonable ranges',
    inputSchema: { type: 'object', properties: { values: { type: 'array', items: { type: 'number' } }, domain: { type: 'string', enum: ['fluid', 'material', 'chemistry'] }, property: { type: 'string' } }, required: ['values', 'domain', 'property'] },
    handler: (i) => {
      try { return checkRange(i as CheckRangeInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'check_code',
    description: 'Check scientific computing code for precision, reproducibility, and performance issues',
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string', enum: ['python', 'c++'] }, checks: { type: 'array', items: { type: 'string', enum: ['precision', 'reproducibility', 'performance'] } } }, required: ['code'] },
    handler: (i) => {
      try { return checkCode(i as CheckCodeInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
];

// v0.5.0 精简导出：只保留物理约束（check_code 由 Claude Code 做）
export const constrainPhysicsTools: MCPToolDefinition<unknown, unknown>[] = constrainTools.filter(t => t.name !== 'check_code');
