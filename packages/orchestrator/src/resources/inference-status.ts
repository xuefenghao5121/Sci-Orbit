import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerInferenceStatusResource(server: McpServer): void {
  server.resource(
    "inference-status",
    "ai4s://inference/status",
    async () => ({
      contents: [{
        uri: "ai4s://inference/status",
        mimeType: "application/json",
        text: JSON.stringify({ servers: [], timestamp: new Date().toISOString() }, null, 2),
      }],
    })
  );
}
