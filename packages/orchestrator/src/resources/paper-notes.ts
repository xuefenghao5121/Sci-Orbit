import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { paperParser } from "../services/paper-parser.js";

export function registerPaperNotesResource(server: McpServer): void {
  server.resource(
    "paper-notes",
    new ResourceTemplate("ai4s://papers/{id}", { list: undefined }),
    async (uri, { id }) => {
      const paperId = (id as { raw?: string })?.raw || String(id);
      const paper = paperParser.get(paperId);

      if (!paper) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: "Paper not found", id: paperId }),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(paper, null, 2),
          },
        ],
      };
    }
  );
}
