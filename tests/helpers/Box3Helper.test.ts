import { describe, expect, it } from "bun:test";
import { Box3Helper } from "@/helpers/Box3Helper.js";
import { LineSegments } from "@/objects/LineSegments.js";

describe("Box3Helper", () => {
  it("Extending", () => {
    expect(new Box3Helper()).toBeInstanceOf(LineSegments);
  });

  it("Instancing", () => {
    expect(new Box3Helper()).toBeTruthy();
  });

  it("type", () => {
    expect(new Box3Helper().type).toBe("Box3Helper");
  });

  it("dispose", () => {
    new Box3Helper().dispose();
  });
});
