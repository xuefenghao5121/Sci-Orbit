import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LLMClientService } from "../../services/llm-client.js";

describe("LLMClientService", () => {
  it("constructs without error", () => {
    const svc = new LLMClientService();
    assert.ok(svc);
  });

  it("rejects invalid requests gracefully", async () => {
    const svc = new LLMClientService();
    try {
      await svc.complete([{ role: "user", content: "test" }], { timeout: 1000 });
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.ok(err.message.includes("401") || err.message.includes("failed") || err.message.includes("error"));
    }
  });
});
