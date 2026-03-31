export const logger = {
  info: (...args: unknown[]) => console.error("[AI4S]", ...args),
  error: (...args: unknown[]) => console.error("[AI4S ERROR]", ...args),
  debug: (...args: unknown[]) => {
    if (process.env.AI4S_DEBUG === "1") console.error("[AI4S DEBUG]", ...args);
  },
};
