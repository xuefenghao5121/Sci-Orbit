import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer): void {
  server.resource(
    "ai4s-status",
    "ai4s://status",
    async () => ({
      contents: [
        {
          uri: "ai4s://status",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              version: "0.1.0",
              status: "running",
              tools: ["classify_task", "generate_plan"],
              mode: "plan-first",
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
