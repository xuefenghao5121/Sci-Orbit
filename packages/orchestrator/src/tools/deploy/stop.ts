import type { InferStopInput, InferStopOutput } from './schemas.js';

export async function inferStop(input: InferStopInput): Promise<InferStopOutput> {
  const { service_url, pid } = input;
  const command = pid ? `kill ${pid}` : `lsof -ti:${service_url?.split(':').pop() || 8000} | xargs kill -9 2>/dev/null; echo "stopped"`;
  return { stopped: true, command };
}
