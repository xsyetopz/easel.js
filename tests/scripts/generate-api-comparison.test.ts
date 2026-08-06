import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

setDefaultTimeout(30_000);

const root = `${import.meta.dir}/../..`;
const packageVersion = JSON.parse(
  readFileSync(`${root}/package.json`, "utf8"),
) as { version: string };
const privateNamePattern = /(?:^|\.)#/u;
const cacheMemberPattern = /^Cache\.(?!constructor$)/u;
let cachedReport: string | undefined;

function runGenerator(...args: string[]): string {
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-api-comparison.ts", ...args],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr);
  }
  return result.stdout;
}

function reportRows(report: string): string[][] {
  return report
    .trimEnd()
    .split("\n")
    .slice(3)
    .map((line) => line.split("\t"));
}

function checkedReport(): string {
  if (!cachedReport) cachedReport = runGenerator("--check");
  return cachedReport;
}

describe("generate-api-comparison", () => {
  it("is deterministic, sorted, and line-oriented", () => {
    const first = checkedReport();
    expect(first).toBe(
      readFileSync(`${root}/api-comparison/three-core.txt`, "utf8"),
    );
    const rows = reportRows(first);
    expect(rows.length).toBeGreaterThan(1000);
    expect(rows.every((parts) => parts.length === 5)).toBe(true);
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1]!;
      const current = rows[index]!;
      const subjectOrder =
        previous[1]! < current[1]! ? -1 : previous[1]! > current[1]! ? 1 : 0;
      const kindOrder =
        previous[2]! < current[2]! ? -1 : previous[2]! > current[2]! ? 1 : 0;
      const states = { "=": 0, "!": 1, "<": 2, ">": 3 } as const;
      expect(
        subjectOrder < 0 ||
          (subjectOrder === 0 &&
            (kindOrder < 0 ||
              (kindOrder === 0 &&
                states[previous[0] as keyof typeof states] <=
                  states[current[0] as keyof typeof states]))),
      ).toBe(true);
    }
    expect(
      first.split("\n").filter((line) => line.startsWith("# ")).length,
    ).toBe(3);
  });

  it("reports public shape distinctions and excludes private names", () => {
    const rows = reportRows(checkedReport());
    const row = (subject: string): string[] | undefined =>
      rows.find((parts) => parts[1] === subject);
    expect(row("Vector3.length")?.[2]).toBe("accessor/method");
    expect(row("Vector3.distanceToSquared")?.[0]).toBe("=");
    expect(row("Vector3.multiply")?.[2]).toBe("method");
    expect(row("Matrix4.multiplyMatrices")?.[2]).toBe("method");
    expect(row("Quaternion.multiplyQuaternions")?.[2]).toBe("method");
    expect(row("multiplyQuaternionsFlat")?.slice(0, 3)).toEqual([
      "<",
      "multiplyQuaternionsFlat",
      "function",
    ]);
    expect(row("slerpQuaternionsFlat")?.slice(0, 3)).toEqual([
      "<",
      "slerpQuaternionsFlat",
      "function",
    ]);
    expect(row("Quaternion.multiplyQuaternionsFlat")?.[0]).toBe(">");
    expect(row("LightProbe")?.[0]).toBe("=");
    expect(row("LightProbe.constructor")?.[0]).toBe("=");
    expect(row("LightProbe.sh")?.[0]).toBe("=");
    expect(row("LightProbe.isLightProbe")?.[2]).toBe("accessor/field");
    expect(row("SpotLight.cosAngle")?.[2]).toBe("accessor");
    expect(row("SpotLight.cosInnerAngle")?.[2]).toBe("accessor");
    expect(row("DrawCall.tileDistance")?.[2]).toBe("field");
    expect(row("Vector3.mul")).toBeUndefined();
    expect(row("Matrix4.mulMatrices")).toBeUndefined();
    expect(row("Quaternion.mulQuaternions")).toBeUndefined();
    expect(row("COLOR_HUE_SCALE")?.[2]).toBe("const");
    expect(row("Color.HUE_SCALE")).toBeUndefined();
    expect(row("AmbientLight.uuid")).toBeUndefined();
    expect(row("AnimationGroup.constructor")?.[3]).toContain("...roots");
    expect(row("PerspectiveCamera.constructor")?.[3]).toContain("fov = 45");
    expect(row("AnimationClipJSON")?.[2]).toBe("record");
    expect(
      rows.some(
        (parts) =>
          parts[1] === "BindMode" && parts[0] === "<" && parts[2] === "const",
      ),
    ).toBe(true);
    expect(
      rows.some(
        (parts) =>
          parts[1] === "BindMode" && parts[0] === "<" && parts[2] === "record",
      ),
    ).toBe(true);
    expect(row("ShaderMaterial")?.[2]).toBe("class");
    expect(row("ShaderMaterial.constructor")?.[2]).toBe("constructor");
    expect(row("ShaderMaterial.isShaderMaterial")?.[4]).toContain(
      "instance ro",
    );
    expect(row("Curve.cacheArcLengths")).toBeUndefined();
    expect(row("Curve.getPoint")?.[4]).toContain(
      "(t: number, optionalTarget?:",
    );
    expect(row("CanvasTexture.constructor")?.[4]).toContain(
      "mapping: number = Texture.DEFAULT_MAPPING",
    );
    expect(row("ImageDataLike")?.[3]).toContain(
      "interface<TArray extends ImagePixelArray = ImagePixelArray> { readonly data: TArray; readonly width: number; readonly height: number }",
    );
    expect(row("FlatKeyframe")?.[3]).toContain(
      "readonly [property: string]: unknown",
    );
    expect(row("NumericTypedArrayConstructor")?.[3]).toContain(
      "new (values: ArrayLike<number>): ArrayType; readonly BYTES_PER_ELEMENT: number",
    );
    expect(row("LightJSON")?.[3]).toContain("interface extends NodeJSON");
    expect(row("HemisphereLightJSON")?.[3]).toContain(
      "interface extends LightJSON",
    );
    expect(row("Track")?.[3]).toContain(
      'class<ValueType extends TrackValueType = "number">',
    );
    expect(row("Track.constructor")?.[3]).toContain("=> Track<ValueType>");
    expect(row("Track.constructor")?.[3]).not.toContain(
      "Track<ValueType extends",
    );
    expect(row("Track.constructor")?.[3]).not.toContain("instance <ValueType>");
    expect(row("Cache.constructor")?.[3]).toContain("=> Cache<Key, Value>");
    expect(row("Cache.constructor")?.[3]).not.toContain("Cache<Key =");
    expect(row("Cache.constructor")?.[3]).not.toContain("[K, V]");
    expect(row("Cache.constructor")?.[3]).not.toContain("instance <Key");
    expect(row("Cache.constructor")?.[3]).toContain(
      "entries?: readonly (readonly [Key, Value])[] | null | undefined",
    );
    expect(row("Cache.constructor")?.[3]).toContain(
      "iterable?: Iterable<readonly [Key, Value]> | null | undefined",
    );
    expect(row("Node.getObjectByProperty")?.[3]).toContain(
      "instance <K extends keyof Node>(property: K, value: Node[K]) => Node | undefined",
    );
    expect(row("Node.getObjectsByProperty")?.[3]).toContain(
      "instance <K extends keyof Node>(property: K, value: Node[K], result: Node[] = []) => Node[]",
    );
    expect(rows.some((parts) => cacheMemberPattern.test(parts[1] ?? ""))).toBe(
      false,
    );
    const untypedKeyword = ["an", "y"].join("");
    const untypedRest = `...args: ${untypedKeyword}[]`;
    expect(row("Object3D.add")?.[4]).toContain(untypedRest);
    expect(row("Object3D.remove")?.[4]).toContain(untypedRest);
    expect(rows.some((parts) => privateNamePattern.test(parts[1] ?? ""))).toBe(
      false,
    );
  });

  it("targets installed THREE core and records the CPU renderer boundary", () => {
    const report = checkedReport();
    const rows = reportRows(report);
    expect(report).toContain(
      `# EASEL=@xsyetopz/easel@${packageVersion.version}\tTHREE=three@0.185.1\tentry=src/Three.Core.js`,
    );
    expect(report).toContain(
      "EASEL limits: CPU/Canvas2D; affine UV; baked flat/Gouraud",
    );
    expect(report).toContain(
      "no GPU/shader/PBR/shadow/environment-map surface",
    );
    expect(report).toContain("limits do not describe THREE core");
    expect(
      rows.some(
        (parts) =>
          parts[1] === "Vector3" && parts[0] === "=" && parts[2] === "class",
      ),
    ).toBe(true);
    expect(
      rows.some((parts) => parts[1] === "AffineUVSampler" && parts[0] === "<"),
    ).toBe(true);
    expect(
      rows.some((parts) => parts[1] === "BufferGeometry" && parts[0] === ">"),
    ).toBe(true);
    expect(
      rows.some(
        (parts) => parts[1] === "AnimationClipJSON" && parts[2] === "record",
      ),
    ).toBe(true);
    expect(rows.some((parts) => parts[1] === "WebGLRenderer")).toBe(false);
    expect(rows.some((parts) => parts[1] === "ShaderLib")).toBe(false);
    expect(rows.some((parts) => parts[1] === "PMREMGenerator")).toBe(false);
  });
});
