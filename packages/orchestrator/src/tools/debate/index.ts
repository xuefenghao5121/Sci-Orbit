export { debateSubmit, debateSubmitRuleBased, debateSubmitWithLLM, hasLLMConfig } from './debate-submit.js';
export { debateRound, debateRoundRuleBased, debateRoundWithLLM } from './debate-round.js';
export { debateResolve, debateResolveRuleBased } from './debate-resolve.js';
export * from './schemas.js';
import { debateSubmit } from './debate-submit.js';
import { debateRound } from './debate-round.js';
import { debateResolve } from './debate-resolve.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { DebateSubmitInput, DebateRoundInput, DebateResolveInput } from './schemas.js';

export const debateTools: MCPToolDefinition<unknown, unknown>[] = [
  { name: 'debate_submit', description: 'Submit a plan for structured debate between proposer and critic', inputSchema: { type: 'object', properties: { plan: { type: 'string', description: 'The plan to debate' }, task_description: { type: 'string', description: 'Original task description' } }, required: ['plan', 'task_description'] }, handler: (i) => debateSubmit(i as DebateSubmitInput) },
  { name: 'debate_round', description: 'Execute a debate round as proposer or critic', inputSchema: { type: 'object', properties: { debate_id: { type: 'string' }, role: { type: 'string', enum: ['proposer', 'critic'] }, argument: { type: 'string' } }, required: ['debate_id', 'role', 'argument'] }, handler: (i) => debateRound(i as DebateRoundInput) },
  { name: 'debate_resolve', description: 'Resolve a debate and produce final plan with consensus', inputSchema: { type: 'object', properties: { debate_id: { type: 'string' }, rounds: { type: 'array', items: { type: 'object' } } }, required: ['debate_id', 'rounds'] }, handler: (i) => debateResolve(i as DebateResolveInput) },
];
