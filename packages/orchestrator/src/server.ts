#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { logger } from "./utils/logger.js";

async function main() {
  const server = new McpServer({
    name: "ai4s-orchestrator",
    version: "0.1.0",
  });

  registerTools(server);
  registerResources(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ai4s-orchestrator MCP Server started on stdio");
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
