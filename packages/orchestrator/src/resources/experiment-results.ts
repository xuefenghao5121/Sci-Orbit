import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { experimentManager } from "../services/experiment-manager.js";

export function registerExperimentResultsResource(server: McpServer): void {
  server.resource(
    "experiment-results",
    new ResourceTemplate("ai4s://experiments/{id}", { list: undefined }),
    async (uri, { id }) => {
      const expId = (id as { raw?: string })?.raw || String(id);
      const experiment = experimentManager.get(expId);

      if (!experiment) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Experiment not found", id: expId }),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(experiment, null, 2),
          },
        ],
      };
    }
  );
}
