import type { EnvSetupInput, EnvSetupOutput } from './schemas.js';
import { envSetupOutput } from './schemas.js';

export function envSetup(input: EnvSetupInput): EnvSetupOutput {
  const name = input.name || 'ai4s_env';
  if (input.target === 'conda') {
    const yml = `name: ${name}
channels:
  - defaults
  - conda-forge
dependencies:
  - python=3.11
  - pip
  - pip:
${input.requirements.map(r => `    - ${r}`).join('\n')}
`;
    const script = `#!/bin/bash\nconda env create -f environment.yml\nconda activate ${name}\n`;
    return envSetupOutput.parse({ setup_script: script, environment_file: yml });
  }

  const dockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
`;
  const reqTxt = input.requirements.join('\n');
  const script = `#!/bin/bash\ndocker build -t ${name} .\ndocker run --gpus all ${name}\n`;
  return envSetupOutput.parse({ setup_script: script, environment_file: dockerfile });
}
