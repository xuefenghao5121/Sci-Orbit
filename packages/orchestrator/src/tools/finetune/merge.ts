import type { FinetuneMergeInput, FinetuneMergeOutput } from './schemas.js';

export async function finetuneMerge(input: FinetuneMergeInput): Promise<FinetuneMergeOutput> {
  const { base_model, adapter_path, output_path } = input;

  const command = `llamafactory-cli export \\
  --model_name_or_path ${base_model} \\
  --adapter_name_or_path ${adapter_path} \\
  --template default \\
  --finetune_type lora \\
  --export_dir ${output_path} \\
  --export_size 2 \\
  --export_legacy_format false`;

  return {
    merged_model_path: output_path,
    size_comparison: {
      base_model_size: 'check manually',
      adapter_size: 'check manually',
      merged_size: 'check after merge',
    },
    command,
  };
}
