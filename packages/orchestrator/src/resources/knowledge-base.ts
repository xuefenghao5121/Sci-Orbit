import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { knowledgeManager } from "../services/knowledge-manager.js";

export function registerKnowledgeBaseResource(server: McpServer): void {
  server.resource(
    "knowledge-base",
    new ResourceTemplate("ai4s://knowledge/{domain}", { list: undefined }),
    async (uri, { domain }) => {
      const domainStr = (domain as { raw?: string })?.raw || String(domain);
      const entries = knowledgeManager.searchByDomain(domainStr);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({
              domain: domainStr,
              count: entries.length,
              entries,
            }, null, 2),
          },
        ],
      };
    }
  );
}
