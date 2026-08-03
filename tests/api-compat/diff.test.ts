import { describe, expect, it } from "bun:test";
import {
  diffManifests,
  diffManifestVersions,
} from "../../scripts/api-compat/diff.ts";
import type {
  ApiManifest,
  ApiMember,
  ApiSignature,
  ApiSymbol,
  SurfaceId,
} from "../../scripts/api-compat/types.ts";

function signature(
  parameters: ApiSignature["parameters"] = [],
  returnType = "void",
): ApiSignature {
  return { parameters, returnType };
}

function member(name: string, options: Partial<ApiMember> = {}): ApiMember {
  return {
    name,
    kind: "method",
    scope: "instance",
    optional: false,
    readonly: false,
    static: false,
    signatures: [signature()],
    ...options,
  };
}

function symbol(
  id: string,
  name: string,
  options: Partial<ApiSymbol> = {},
): ApiSymbol {
  return {
    id,
    name,
    kind: "class",
    exportKind: "named",
    extends: [],
    implements: [],
    typeParameters: [],
    constructors: [],
    signatures: [],
    members: [],
    ...options,
  };
}

function manifest(
  surface: SurfaceId,
  symbols: ApiSymbol[],
  version = "1.0.0",
  packageName = surface === "easel" ? "easel" : "three",
): ApiManifest {
  return {
    schemaVersion: 1,
    manifestVersion: "1.0",
    package: { name: packageName, version },
    surface: {
      id: surface,
      name: surface,
      entrypoint: `${surface}.js`,
      sourceRoot: "src",
    },
    exports: symbols.map((item) => ({
      name: item.name,
      id: item.id,
      kind: item.kind,
    })),
    symbols,
    provenance: {
      extractor: "test",
      compiler: "test",
      entrypoint: `${surface}.js`,
      files: [],
    },
  };
}

const noMappings = { schemaVersion: 1 as const, mappings: [] };

describe("surface-aware compatibility diff", () => {
  it("does not let a mapping for another surface suppress exact-name matching", () => {
    const source = manifest("easel", [symbol("easel:Node", "Node")]);
    const webgpu = manifest("three-webgpu", [
      symbol("three-webgpu:Node", "Node"),
    ]);
    const mapping = {
      schemaVersion: 1 as const,
      mappings: [
        {
          source: "easel:Node",
          target: "three-core:Object3D",
          status: "adapted" as const,
          notes: ["core mapping"],
        },
      ],
    };
    const report = diffManifests(source, webgpu, mapping);
    const comparison = report.comparisons[0];
    expect(comparison?.target?.id).toBe("three-webgpu:Node");
    expect(comparison?.status).toBe("unknown");
    expect(comparison?.notes).toEqual([]);
    expect(report.summary.exactNameMatches).toBe(1);
    // A report is generated per surface.  Passing the WebGPU surface alone
    // ensures the core-targeted mapping is ignored rather than treated as a
    // missing WebGPU target.
    expect(
      diffManifests(source, [webgpu], mapping).comparisons[0]?.target?.id,
    ).toBe("three-webgpu:Node");
  });

  it("reports inheritance, overload, default, return, type-parameter and member deltas", () => {
    const sourceSignature = signature(
      [
        {
          name: "value",
          type: "string",
          optional: false,
          rest: false,
          default: "x",
        },
      ],
      "string",
    );
    sourceSignature.typeParameters = [{ name: "T", constraint: "string" }];
    const targetSignature = signature(
      [
        {
          name: "value",
          type: "number",
          optional: true,
          rest: false,
          default: "0",
        },
        { name: "extra", type: "boolean", optional: false, rest: false },
      ],
      "number",
    );
    targetSignature.typeParameters = [
      { name: "U", constraint: "number", default: "1" },
    ];
    const source = manifest("easel", [
      symbol("easel:Thing", "Thing", {
        extends: ["Base"],
        implements: ["Readable"],
        typeParameters: [{ name: "T", constraint: "string" }],
        type: "number",
        deprecated: "Use OtherThing.",
        constructors: [sourceSignature, signature()],
        signatures: [sourceSignature],
        members: [member("run", { signatures: [sourceSignature] })],
      }),
    ]);
    const target = manifest("three-core", [
      symbol("three-core:Thing", "Thing", {
        extends: ["Derived"],
        implements: ["Writable"],
        typeParameters: [{ name: "U", constraint: "number", default: "1" }],
        type: "string",
        constructors: [targetSignature],
        signatures: [targetSignature, signature()],
        members: [
          member("run", { signatures: [targetSignature] }),
          member("newMember"),
        ],
      }),
    ]);
    const structural = diffManifests(source, target, noMappings).comparisons[0]
      ?.structural;
    expect(structural?.exportName.changed).toBe(false);
    expect(structural?.kind.changed).toBe(false);
    expect(structural?.type).toEqual({
      source: "number",
      target: "string",
      changed: true,
    });
    expect(structural?.deprecated).toEqual({
      source: "Use OtherThing.",
      changed: true,
    });
    expect(structural?.inheritance.extends).toEqual({
      added: ["Derived"],
      removed: ["Base"],
    });
    expect(structural?.inheritance.implements).toEqual({
      added: ["Writable"],
      removed: ["Readable"],
    });
    expect(structural?.typeParameters.changed[0]?.changes).toEqual([
      "name",
      "constraint",
      "default",
    ]);
    expect(structural?.constructors.matched).toBe(0);
    expect(
      structural?.constructors.changed[0]?.delta.parameters.changed[0]?.changes,
    ).toEqual(["type", "optional", "default"]);
    expect(
      structural?.constructors.changed[0]?.delta.parameters.added[0]?.name,
    ).toBe("extra");
    expect(structural?.constructors.changed[0]?.delta.returnType).toEqual({
      source: "string",
      target: "number",
      changed: true,
    });
    expect(
      structural?.constructors.changed[0]?.delta.typeParameters.changed[0]
        ?.changes,
    ).toEqual(["name", "constraint", "default"]);
    expect(structural?.callSignatures.added).toHaveLength(1);
    expect(structural?.members.changed[0]?.signatureChanges[0]?.source).toEqual(
      sourceSignature,
    );
    expect(structural?.members.extraInTarget).toEqual([
      "instance:newMember:method",
    ]);
  });
});

describe("same-package version diff", () => {
  it("attributes added, removed and changed symbols to one surface upgrade", () => {
    const source = manifest(
      "three-core",
      [
        symbol("three-core:Stable", "Stable"),
        symbol("three-core:Removed", "Removed"),
        symbol("three-core:Changed", "Changed", {
          members: [member("old")],
        }),
      ],
      "0.185.1",
    );
    const target = manifest(
      "three-core",
      [
        symbol("three-core:Stable", "Stable"),
        symbol("three-core:Added", "Added"),
        symbol("three-core:Changed", "Changed", {
          members: [member("new")],
        }),
      ],
      "0.186.0",
    );
    const report = diffManifestVersions(source, target, {
      sourceManifestPath: "locked",
      targetManifestPath: "latest-candidate",
    });
    expect(report.generatedFrom.source.version).toBe("0.185.1");
    expect(report.generatedFrom.target.version).toBe("0.186.0");
    expect(report.symbols.added.map((item) => item.id)).toEqual([
      "three-core:Added",
    ]);
    expect(report.symbols.removed.map((item) => item.id)).toEqual([
      "three-core:Removed",
    ]);
    expect(report.symbols.changed.map((item) => item.id)).toEqual([
      "three-core:Changed",
    ]);
    expect(
      report.symbols.changed[0]?.structural.members.missingInTarget,
    ).toEqual(["instance:old:method"]);
    expect(report.symbols.changed[0]?.structural.members.extraInTarget).toEqual(
      ["instance:new:method"],
    );
    expect(report.summary).toEqual({
      sourceSymbols: 3,
      targetSymbols: 3,
      added: 1,
      removed: 1,
      changed: 1,
    });
  });

  it("rejects cross-surface version comparisons", () => {
    const source = manifest("three-core", []);
    const target = manifest("three-addons", []);
    expect(() => diffManifestVersions(source, target)).toThrow(/same surface/u);
  });
});
