/**
 * MCPToolDefinition — 活跃工具模块共享的类型定义
 */
export interface MCPToolDefinition<TI, TO> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: TI) => Promise<TO>;
}
