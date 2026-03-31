import type { InferTestInput, InferTestOutput } from './schemas.js';

export async function inferTest(input: InferTestInput): Promise<InferTestOutput> {
  const { service_url, test_cases } = input;

  const script = `#!/usr/bin/env python3
"""Test inference service quality — auto-generated."""
import json, time, requests

URL = "${service_url}"
CASES = ${JSON.stringify(test_cases, null, 2)}

results = []
for i, case in enumerate(CASES):
    start = time.time()
    try:
        resp = requests.post(f"{URL}/v1/chat/completions", json={
            "model": "default",
            "messages": [{"role": "user", "content": case["prompt"]}],
            "max_tokens": case.get("max_tokens", 256),
        }, timeout=60)
        latency = (time.time() - start) * 1000
        text = resp.json()["choices"][0]["message"]["content"]
        results.append({"prompt": case["prompt"], "response": text, "latency_ms": round(latency, 1)})
    except Exception as e:
        results.append({"prompt": case["prompt"], "response": f"ERROR: {e}", "latency_ms": -1})

latencies = [r["latency_ms"] for r in results if r["latency_ms"] > 0]
summary = {"avg_latency_ms": round(sum(latencies)/len(latencies), 1) if latencies else 0, "total_tests": len(results)}
print(json.dumps({"responses": results, "scores": summary}, indent=2))
`;

  return {
    responses: [],
    scores: { avg_latency_ms: 0, total_tests: test_cases.length },
    test_script: script,
  };
}
