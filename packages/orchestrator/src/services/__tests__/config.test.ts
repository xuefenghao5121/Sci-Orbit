import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mock HOME for testing
const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ai4s-test-"));
process.env.HOME = TEST_DIR;

// Need to set up the AI4S dir before importing
fs.mkdirSync(path.join(TEST_DIR, ".claude", "ai4s"), { recursive: true });

const { ConfigService, DEFAULT_CONFIG } = await import("../../services/config.js");

describe("ConfigService", () => {
  it("loads default config when no file exists", () => {
    const svc = new ConfigService();
    const cfg = svc.get();
    assert.equal(cfg.version, DEFAULT_CONFIG.version);
    assert.equal(cfg.llm.provider, "anthropic");
  });

  it("validates config correctly", () => {
    const svc = new ConfigService();
    assert.deepEqual(svc.validate(), []);
  });

  it("detects invalid config", () => {
    const svc = new ConfigService();
    svc.update({ llm: { provider: "custom" as any, baseUrl: "" } });
    const errors = svc.validate();
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes("baseUrl"));
  });

  // Cleanup
  it.after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
