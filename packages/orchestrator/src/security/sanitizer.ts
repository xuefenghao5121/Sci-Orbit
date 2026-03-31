/** Sanitize user inputs to prevent injection attacks */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>&"']/g, (c) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&#x27;",
    }[c] || c))
    .trim();
}

export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const safeKey = sanitizeId(key);
    if (typeof value === "string") {
      result[safeKey] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[safeKey] = value.map((v) => typeof v === "string" ? sanitizeString(v) : v);
    } else if (typeof value === "object" && value !== null) {
      result[safeKey] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[safeKey] = value;
    }
  }
  return result;
}
