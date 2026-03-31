import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Security modules", () => {
  it("sanitizeString escapes HTML", async () => {
    const { sanitizeString } = await import("../../security/sanitizer.js");
    assert.equal(sanitizeString("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
  });

  it("sanitizeId removes special chars", async () => {
    const { sanitizeId } = await import("../../security/sanitizer.js");
    assert.equal(sanitizeId("../../../etc/passwd"), "_________etc_passwd");
  });

  it("validatePath blocks traversal", async () => {
    const { validatePath } = await import("../../security/validator.js");
    assert.throws(() => validatePath("../etc/passwd"), /path traversal/);
  });

  it("validatePath blocks absolute paths", async () => {
    const { validatePath } = await import("../../security/validator.js");
    assert.throws(() => validatePath("/etc/passwd"), /absolute paths/);
  });

  it("RateLimiter enforces limits", async () => {
    const { RateLimiter } = await import("../../security/rate-limiter.js");
    const limiter = new RateLimiter(3, 1000);
    assert.equal(limiter.check("t1").allowed, true);
    assert.equal(limiter.check("t1").allowed, true);
    assert.equal(limiter.check("t1").allowed, true);
    assert.equal(limiter.check("t1").allowed, false);
  });
});
