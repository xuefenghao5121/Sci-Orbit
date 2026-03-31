import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ai4s-storage-"));
process.env.HOME = TEST_DIR;
fs.mkdirSync(path.join(TEST_DIR, ".claude", "ai4s"), { recursive: true });

const { StorageService } = await import("../../services/storage.js");

describe("StorageService", () => {
  it("returns empty list for new storage", () => {
    const svc = new StorageService();
    assert.deepEqual(svc.list("papers"), []);
  });

  it("stores and retrieves records", () => {
    const svc = new StorageService();
    svc.put("papers", { id: "test1", createdAt: "", updatedAt: "", title: "Test Paper" } as any);
    const record = svc.get("papers", "test1");
    assert.ok(record);
    assert.equal(record!.title, "Test Paper");
  });

  it("deletes records", () => {
    const svc = new StorageService();
    svc.put("papers", { id: "del1", createdAt: "", updatedAt: "" } as any);
    assert.equal(svc.delete("papers", "del1"), true);
    assert.equal(svc.delete("papers", "del1"), false);
  });

  it("searches records", () => {
    const svc = new StorageService();
    svc.put("papers", { id: "s1", createdAt: "", updatedAt: "", title: "Machine Learning Basics" } as any);
    svc.put("papers", { id: "s2", createdAt: "", updatedAt: "", title: "Deep Learning Advanced" } as any);
    const results = svc.search("papers", "Learning");
    assert.equal(results.length, 2);
  });

  it.after(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
