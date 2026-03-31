import type { ScienceJupyterInput, ScienceJupyterOutput } from './schemas.js';

export async function scienceJupyter(input: ScienceJupyterInput): Promise<ScienceJupyterOutput> {
  const { operation, notebook_path, cells, export_format } = input;

  if (operation === 'create' && cells) {
    const notebook = {
      cells: cells.map(c => ({
        cell_type: c.cell_type,
        source: c.source.split('\n').map((line, i, arr) => line + (i < arr.length - 1 ? '\n' : '')),
        metadata: {},
        outputs: c.cell_type === 'code' ? [] : undefined,
        execution_count: c.cell_type === 'code' ? null : undefined,
      })),
      metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python' } },
      nbformat: 4,
      nbformat_minor: 5,
    };
    const { writeFileSync } = await import('fs');
    writeFileSync(notebook_path, JSON.stringify(notebook, null, 2));

    const script = `#!/usr/bin/env python3
"""Create Jupyter notebook: ${notebook_path}"""
# Notebook created. To run:
# jupyter nbconvert --to notebook --execute ${notebook_path} --output ${notebook_path}
`;
    return { notebook_path, script };
  }

  const script = operation === 'run'
    ? `#!/usr/bin/env python3\njupyter nbconvert --to notebook --execute ${notebook_path} --output ${notebook_path} --ExecutePreprocessor.timeout=600`
    : `#!/usr/bin/env python3\njupyter nbconvert --to ${export_format} ${notebook_path}`;

  return {
    notebook_path,
    execution_results: operation === 'run' ? [] : undefined,
    html_export: operation === 'export' ? notebook_path.replace('.ipynb', `.${export_format}`) : undefined,
    script,
  };
}
