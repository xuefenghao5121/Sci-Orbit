import type { DebateResolveInput, DebateResolveOutput } from './schemas.js';
import { debateResolveOutput } from './schemas.js';

export function debateResolveRuleBased(input: DebateResolveInput): DebateResolveOutput {
  const rounds = input.rounds;
  const proposerRounds = rounds.filter(r => r.role === 'proposer');
  const criticRounds = rounds.filter(r => r.role === 'critic');
  const avgProposer = proposerRounds.length > 0 ? proposerRounds.reduce((s, r) => s + r.scores.logical_coherence, 0) / proposerRounds.length : 5;
  const avgCritic = criticRounds.length > 0 ? criticRounds.reduce((s, r) => s + r.scores.logical_coherence, 0) / criticRounds.length : 5;
  const consensus = Math.min(1, (avgProposer + avgCritic) / 20);
  const modifications = criticRounds.map((_, i) => 'Address critic concerns from round ' + (i + 1));
  return debateResolveOutput.parse({
    final_plan: `[Debate ${input.debate_id} resolved] Consensus: ${(consensus * 100).toFixed(0)}%`,
    consensus_score: consensus,
    modifications,
  });
}

export async function debateResolve(input: DebateResolveInput): Promise<DebateResolveOutput> {
  return debateResolveRuleBased(input);
}
