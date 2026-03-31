import path from "node:path";

const ALLOWED_BASE = process.env.HOME ? path.join(process.env.HOME, ".claude", "ai4s") : "/tmp";

/** Validate that a path doesn't escape the allowed base directory */
export function validatePath(userInput: string): void {
  if (!userInput) return;

  // Block path traversal
  if (userInput.includes("..") || userInput.includes("\0")) {
    throw new Error(`Invalid path: path traversal detected in "${userInput}"`);
  }

  // Block absolute paths
  if (path.isAbsolute(userInput)) {
    throw new Error(`Invalid path: absolute paths not allowed: "${userInput}"`);
  }

  // Resolve and check
  const resolved = path.resolve(ALLOWED_BASE, userInput);
  if (!resolved.startsWith(ALLOWED_BASE)) {
    throw new Error(`Invalid path: escapes allowed directory: "${userInput}"`);
  }
}

/** Validate a full file path stays within bounds */
export function validateFullPath(filePath: string, baseDir?: string): string {
  const base = baseDir || ALLOWED_BASE;
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(base)) {
    throw new Error(`Path "${filePath}" escapes allowed directory`);
  }
  return resolved;
}
