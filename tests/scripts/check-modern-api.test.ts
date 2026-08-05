import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import process from "node:process";

describe("modern API policy", () => {
  it("rejects enums, static class items, and private keywords", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/check-modern-api.ts"],
      {
        cwd: `${import.meta.dir}/../..`,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Modern API policy passed");
  });
});
