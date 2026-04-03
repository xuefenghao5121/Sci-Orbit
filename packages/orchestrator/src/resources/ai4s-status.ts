import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { environmentDetector } from "../services/environment-detector.js";
import { configService } from "../services/config.js";

export function registerAi4sStatusResource(server: McpServer): void {
  server.resource("ai4s-status", "ai4s://status", async () => {
    const env = await environmentDetector.detect();
    const config = configService.getAll();
    const errors = configService.validate();

    return {
      contents: [
        {
          uri: "ai4s://status",
          mimeType: "application/json",
          text: JSON.stringify({
            version: config.version,
            status: "running",
            tools: [
              "classify_task", "generate_plan", "review_plan",
              "parse_paper", "manage_experiment", "manage_knowledge",
              "detect_environment", "manage_config",
            ],
            mode: "plan-first",
            environment: env,
            config: {
              llm: { provider: config.llm.provider, model: config.llm.model },
              storage: config.storage.basePath,
            },
            errors,
          }, null, 2),
        },
      ],
    };
  });
}
