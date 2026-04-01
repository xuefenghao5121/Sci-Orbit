import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { FinetunePrepareInput, FinetunePrepareOutput } from './schemas.js';

export async function finetunePrepare(input: FinetunePrepareInput): Promise<FinetunePrepareOutput> {
  const { data_source, format, output_dir } = input;
  if (!existsSync(output_dir)) mkdirSync(output_dir, { recursive: true });

  // Generate data preparation script
  const script = generatePrepareScript(data_source, format, output_dir);
  const scriptPath = join(output_dir, 'prepare_data.py');
  writeFileSync(scriptPath, script);

  return {
    dataset_info: {
      sample_count: 0,
      format,
      path: join(output_dir, `dataset_${format}.json`),
      avg_instruction_length: 0,
      avg_output_length: 0,
    },
    quality_report: {
      total_samples: 0,
      empty_count: 0,
      duplicate_count: 0,
      avg_quality_score: 0,
      issues: ['Run prepare_data.py to generate dataset and get actual statistics'],
    },
  };
}

function generatePrepareScript(source: FinetunePrepareInput['data_source'], format: string, outputDir: string): string {
  // Check for unsupported data source types
  if (source.type === 'knowledge_base_id' || source.type === 'paper_id') {
    // Generate a script that will output a clear error message
    return `#!/usr/bin/env python3
"""Data preparation script - ERROR: Unsupported data source type"""

import sys
import json

SOURCE_TYPE = "${source.type}"
SOURCE_PATH = "${source.path}"

def main():
    error_msg = f"ERROR: Data source type '{SOURCE_TYPE}' is not yet supported. Use 'directory' type instead."
    print(error_msg, file=sys.stderr)
    print("\\nSupported data source types:", file=sys.stderr)
    print("  - directory: Local directory containing JSON/JSONL files", file=sys.stderr)
    print("\\nExample usage:", file=sys.stderr)
    print('  data_source: { type: "directory", path: "/path/to/training/data" }', file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    main()
`;
  }

  // Original script for supported 'directory' type
  return `#!/usr/bin/env python3
"""Auto-generated data preparation script for fine-tuning."""
import json, os, hashlib

SOURCE_TYPE = "${source.type}"
SOURCE_PATH = "${source.path}"
FORMAT = "${format}"
OUTPUT_DIR = "${outputDir}"

def load_source():
    if SOURCE_TYPE == "directory":
        with open(SOURCE_PATH, 'r') as f:
            return json.load(f)
    elif SOURCE_TYPE == "knowledge_base_id":
        # Placeholder: integrate with knowledge base API
        raise NotImplementedError("Knowledge base integration not yet implemented")
    elif SOURCE_TYPE == "paper_id":
        raise NotImplementedError("Paper extraction not yet implemented")

def convert_to_format(data):
    if FORMAT == "alpaca":
        return [{"instruction": d.get("instruction",""), "input": d.get("input",""), "output": d.get("output","")} for d in data]
    elif FORMAT == "sharegpt":
        return [{"conversations": d.get("conversations", [])} for d in data]
    return data

def quality_check(data):
    issues = []
    empty = sum(1 for d in data if not d.get("instruction") and not d.get("conversations"))
    dedup = len(set(hashlib.md5(json.dumps(d, sort_keys=True).encode()).hexdigest() for d in data))
    issues.append(f"Empty samples: {empty}")
    issues.append(f"Unique samples: {dedup}/{len(data)}")
    return issues

if __name__ == "__main__":
    data = load_source()
    converted = convert_to_format(data)
    out_path = os.path.join(OUTPUT_DIR, f"dataset_{FORMAT}.json")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)
    issues = quality_check(converted)
    print(f"Prepared {len(converted)} samples -> {out_path}")
    print(f"Quality: {issues}")
`;
}
