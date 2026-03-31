import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAi4sStatusResource } from "./ai4s-status.js";
import { registerPaperNotesResource } from "./paper-notes.js";
import { registerExperimentResultsResource } from "./experiment-results.js";
import { registerKnowledgeBaseResource } from "./knowledge-base.js";
import { registerInferenceStatusResource } from "./inference-status.js";

export function registerResources(server: McpServer): void {
  registerAi4sStatusResource(server);
  registerPaperNotesResource(server);
  registerExperimentResultsResource(server);
  registerKnowledgeBaseResource(server);
  registerInferenceStatusResource(server);
}
