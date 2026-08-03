import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  defaultSurfaceOptions,
  extractManifest,
} from "../../scripts/api-compat/extract.ts";

const repositoryRoot = resolve(import.meta.dir, "../..");

function fixtureOptions(rootFile: string, sourceRoot: string) {
  return {
    packageName: "fixture",
    packageVersion: "1.0.0",
    surface: "easel" as const,
    entrypoint: "index.ts",
    sourceRoot,
    rootFile,
    packageRoot: resolve(sourceRoot, ".."),
  };
}

describe.serial("API extractor", () => {
  it.serial(
    "models three.js runtime exports and value declarations exactly",
    async () => {
      const option = defaultSurfaceOptions({ repositoryRoot }).find(
        (item) => item.surface === "three-core",
      );
      expect(option).toBeDefined();
      const [manifest, runtime] = await Promise.all([
        extractManifest(option!),
        import("three"),
      ]);
      const manifestNames = manifest.exports.map((item) => item.name).sort();
      const runtimeNames = Object.keys(runtime).sort();
      expect(manifestNames).toEqual(runtimeNames);

      for (const name of ["Object3D", "Raycaster", "WebGLRenderer"]) {
        const symbol = manifest.symbols.find((item) => item.name === name);
        expect(symbol?.kind).toBe("class");
        expect(symbol?.constructors.length).toBeGreaterThan(0);
      }
      const raycaster = manifest.symbols.find(
        (item) => item.name === "Raycaster",
      );
      expect(raycaster?.members.some((item) => item.name === "ray")).toBe(true);
      expect(
        raycaster?.members.filter((item) => item.name === "ray").length,
      ).toBe(1);
      const renderer = manifest.symbols.find(
        (item) => item.name === "WebGLRenderer",
      );
      const render = renderer?.members.find((item) => item.name === "render");
      expect(render?.kind).toBe("method");
      expect(render?.signatures?.[0]?.parameters).toEqual([
        { name: "scene", type: "Object3D", optional: false, rest: false },
        { name: "camera", type: "Camera", optional: false, rest: false },
      ]);
      expect(renderer?.members.some((item) => item.name.startsWith("_"))).toBe(
        false,
      );
      const object3d = manifest.symbols.find(
        (item) => item.name === "Object3D",
      );
      const lookAt = object3d?.members.find((item) => item.name === "lookAt");
      expect(
        lookAt?.signatures?.[0]?.parameters.map((item) => item.optional),
      ).toEqual([false, true, true]);
      for (const symbol of manifest.symbols) {
        for (const member of symbol.members) {
          if (member.type) {
            expect(member.type.split("{").length).toBe(
              member.type.split("}").length,
            );
          }
          for (const item of member.signatures ?? []) {
            if (item.returnType) {
              expect(item.returnType.split("{").length).toBe(
                item.returnType.split("}").length,
              );
            }
          }
        }
      }
      expect(
        manifest.provenance.files.some((file) =>
          /Three\.TSL|webgpu|WebGPU/u.test(file.path),
        ),
      ).toBe(false);
    },
  );

  it.serial(
    "resolves the TSL facade to callable node declarations",
    async () => {
      const option = defaultSurfaceOptions({ repositoryRoot }).find(
        (item) => item.surface === "three-tsl",
      );
      expect(option).toBeDefined();
      const tslEntrypoint: string = "three/tsl";
      const [manifest, runtime] = await Promise.all([
        extractManifest(option!),
        import(tslEntrypoint),
      ]);
      expect(manifest.exports.map((item) => item.name).sort()).toEqual(
        Object.keys(runtime).sort(),
      );
      for (const name of ["abs", "vec3"]) {
        const symbol = manifest.symbols.find((item) => item.name === name);
        expect(symbol?.kind).toBe("function");
        expect(symbol?.signatures.length).toBeGreaterThan(0);
        expect(symbol?.source).toContain("src/nodes/");
      }
      const cellNoise = manifest.symbols.find(
        (item) => item.name === "mx_cell_noise_float",
      );
      expect(cellNoise?.source).toBe("src/nodes/materialx/MaterialXNodes.js");
      expect(cellNoise?.signatures[0]?.parameters).toHaveLength(1);
      expect(cellNoise?.signatures[0]?.parameters[0]?.name).toBe("texcoord");
      expect(cellNoise?.signatures[0]?.parameters[0]?.optional).toBe(true);
      const fractalNoise = manifest.symbols.find(
        (item) => item.name === "mx_fractal_noise_float",
      );
      expect(fractalNoise?.source).toBe(
        "src/nodes/materialx/MaterialXNodes.js",
      );
      expect(fractalNoise?.signatures[0]?.parameters).toHaveLength(5);
      expect(
        manifest.provenance.files.some(
          (file) =>
            file.path !== "src/Three.TSL.js" &&
            file.path.startsWith("src/nodes/"),
        ),
      ).toBe(true);
    },
  );

  it.serial(
    "captures generic overloads, defaults, static members, deprecations, and inheritance",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "easel-api-fixture-"));
      const sourceRoot = join(root, "src");
      const rootFile = join(sourceRoot, "index.ts");
      mkdirSync(sourceRoot);
      writeFileSync(
        rootFile,
        `/** @deprecated Use Replacement instead. */
export class Generic<T extends object = object> extends Base {
	private privateField = 1;
	protected protectedField = 2;
	#secret = 3;
	/** @internal */
	internalField = 4;
	publicField = 5;
	constructor() {}
	static create(value = 1): Generic<object> { return new Generic(value); }
	get value(): number { return this.publicField; }
	set value(next: number) { this.publicField = next; }
	private hiddenMethod(): void {}
	protected protectedMethod(): void {}
	overloaded(value: string): string;
	overloaded(value: number): number;
	overloaded(value: string | number): string | number { return value; }
}
class Base { base = true; }
export function choose(value: string): string;
export function choose(value: number, fallback = 0): number;
export function choose(value: string | number, fallback = 0): string | number { return value || fallback; }
export function optionalUndefined(value: string | undefined = void 0): string | undefined { return value; }
`,
      );

      const manifest = await extractManifest(
        fixtureOptions(rootFile, sourceRoot),
      );
      const generic = manifest.symbols.find((item) => item.name === "Generic");
      expect(generic?.kind).toBe("class");
      expect(generic?.extends).toEqual(["Base"]);
      expect(generic?.typeParameters).toEqual([
        { name: "T", constraint: "object", default: "object" },
      ]);
      expect(generic?.deprecated).toContain("Use Replacement");
      expect(generic?.constructors.length).toBeGreaterThan(0);
      expect(generic?.members.some((item) => item.name === "publicField")).toBe(
        true,
      );
      for (const name of [
        "privateField",
        "protectedField",
        "#secret",
        "internalField",
        "hiddenMethod",
        "protectedMethod",
      ]) {
        expect(generic?.members.some((item) => item.name === name)).toBe(false);
      }
      const value = generic?.members.find((item) => item.name === "value");
      expect(value?.kind).toBe("accessor");
      expect(value?.access).toBe("get-set");
      expect(
        generic?.members.filter((item) => item.name === "value").length,
      ).toBe(1);
      const create = generic?.members.find((item) => item.name === "create");
      expect(create?.scope).toBe("static");
      expect(create?.signatures?.[0]?.parameters[0]?.default).toBe("1");
      const choose = manifest.symbols.find((item) => item.name === "choose");
      expect(choose?.kind).toBe("function");
      expect(choose?.signatures.length).toBe(2);
      expect(choose?.signatures[1]?.parameters[1]?.default).toBe("0");
      const optionalUndefined = manifest.symbols.find(
        (item) => item.name === "optionalUndefined",
      );
      expect(optionalUndefined?.signatures[0]?.parameters[0]?.default).toBe(
        "undefined",
      );
    },
  );

  it.serial(
    "keeps JS constructor fields while omitting private and internal fields",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "easel-api-js-fixture-"));
      const sourceRoot = join(root, "src");
      const rootFile = join(sourceRoot, "index.js");
      mkdirSync(sourceRoot);
      writeFileSync(
        rootFile,
        `/** @deprecated Use NewThing instead. */
export class JsThing {
	#secret = 0;
	constructor(value = 7) {
		/** @type {number} */
		this.value = value;
		/** @private */
		this.hidden = 1;
		/** @internal */
		this.internal = 2;
	}
	/** @deprecated Call replacement instead. */
	method(input = 1) { return input; }
	static make() { return new JsThing(); }
}
`,
      );

      const manifest = await extractManifest(
        fixtureOptions(rootFile, sourceRoot),
      );
      const thing = manifest.symbols.find((item) => item.name === "JsThing");
      expect(thing?.kind).toBe("class");
      expect(thing?.deprecated).toContain("Use NewThing");
      expect(thing?.constructors[0]?.parameters[0]?.default).toBe("7");
      expect(thing?.members.some((item) => item.name === "value")).toBe(true);
      expect(thing?.members.some((item) => item.name === "hidden")).toBe(false);
      expect(thing?.members.some((item) => item.name === "internal")).toBe(
        false,
      );
      expect(thing?.members.some((item) => item.name === "#secret")).toBe(
        false,
      );
      expect(
        thing?.members.find((item) => item.name === "method")?.deprecated,
      ).toContain("Call replacement");
      expect(thing?.members.find((item) => item.name === "make")?.scope).toBe(
        "static",
      );
    },
  );
});
