#!/usr/bin/env node

import { logger } from "./utils/logger.js";
import { VERSION } from "./version.js";

const BOOT_START = performance.now();

async function main() {
  logger.info(`ai4s-orchestrator v${VERSION} initializing...`);
  logger.info(`Node.js: ${process.version} | PID: ${process.pid}`);

  const { configService } = await import("./services/config.js");
  const errors = configService.validate();
  if (errors.length > 0) {
    logger.error("Config validation errors:", errors.join(", "));
  }

  // Import and run server
  await import("./server.js");

  const bootMs = Math.round(performance.now() - BOOT_START);
  logger.info(`🚀 Cold boot completed in ${bootMs}ms`);
}

function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception:", err);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
  });
}

setupGracefulShutdown();
main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
