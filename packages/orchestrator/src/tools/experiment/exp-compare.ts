import type { ExpCompareInput, ExpCompareOutput } from './schemas.js';
import { expCompareOutput } from './schemas.js';

export function expCompare(input: ExpCompareInput): ExpCompareOutput {
  const { results } = input;
  if (results.length === 0) throw new Error('No results to compare');

  const allMetrics = new Set<string>();
  for (const r of results) for (const k of Object.keys(r.metrics)) allMetrics.add(k);

  const table = results.map((r, i) => {
    const row: Record<string, string> = { experiment: `#${i + 1}`, ...Object.fromEntries(Object.entries(r.config).map(([k, v]) => [k, v])) };
    for (const m of allMetrics) row[m] = String(r.metrics[m] ?? 'N/A');
    return row;
  });

  // Find best by first metric
  const metricsArr = Array.from(allMetrics);
  const firstMetric = metricsArr[0] || 'accuracy';
  let bestIdx = 0;
  let bestVal = results[0].metrics[firstMetric] ?? 0;
  const higherIsBetter = !['loss', 'error', 'time'].some(k => firstMetric.includes(k));
  for (let i = 1; i < results.length; i++) {
    const v = results[i].metrics[firstMetric] ?? 0;
    if (higherIsBetter ? v > bestVal : v < bestVal) { bestVal = v; bestIdx = i; }
  }

  return expCompareOutput.parse({
    comparison_table: table,
    best_config: results[bestIdx].config,
    analysis: `Best config is #${bestIdx + 1} with ${firstMetric}=${bestVal}. ${results.length} experiments compared across ${allMetrics.size} metrics.`,
  });
}
