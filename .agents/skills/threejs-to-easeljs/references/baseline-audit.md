# Baseline and audit

This reference records the inspected `three@0.185.1` and EASEL 0.7.0 baseline and the audit method. It does not replace inspection of a consumer's resolved packages.

## Exact reference installations

### Three.js source

- Repository `package.json` declares the development dependency `three: ^0.185.1`.
- The inspected `node_modules/three/package.json` is version `0.185.1`; `node_modules/three/src/constants.js` declares `REVISION = "185"`.
- The package export map includes core (`.`), `./examples/jsm/*`, `./addons`, `./addons/*`, `./src/*`, `./webgpu`, and `./tsl`. `src/Three.js` is the WebGL core entry and `examples/jsm/Addons.js` is the add-on aggregate.
- No `.d.ts` files occur in this installed Three package. Runtime modules and JSDoc are the bundled evidence. Version and inspect any external declaration package separately.

### EASEL target

- Repository `package.json` is `@xsyetopz/easel` version `0.7.0`.
- `src/index.ts` declares `REVISION = "0.7.0"` and owns the root exports.
- The package export map points consumers to `dist/index.d.ts`; the owning `src/**/*.ts` declarations and implementations are authoritative for this checkout.

A temporary consumer probe can establish the resolved target:

```ts
import * as EASEL from "@xsyetopz/easel";

if (EASEL.REVISION !== "0.7.0") {
  throw new Error(`This audit expects EASEL 0.7.0, got ${EASEL.REVISION}`);
}
```

Do not retain the assertion when the application deliberately supports a version range; convert it to the application's compatibility policy.

## Evidence layers

Check both layers before assigning `direct`:

1. **Public surface:** the symbol is exported and its declaration establishes the construction and result contract.
2. **Required consumer:** the main renderer, DOM renderer, loader, exporter, or other subsystem consumes the state relied on by the application.

EASEL 0.7.0 exports `Sprite`, `SpriteMaterial`, `SkinnedMesh`, morph fields, `ArrayCamera`, and `StereoCamera`. That does not establish every draw, deformation, or multi-view path. For main-renderer questions, inspect `src/pipeline/SceneTraversal.ts` and the matching assembly, shading, or rasterizer path.

## Freeze the actual source

Use searches like these, adjusted for source directories and generated-file exclusions:

```sh
rg -n '"three"|three/(addons|examples/jsm|webgpu|tsl)'   package.json bun.lock package-lock.json pnpm-lock.yaml yarn.lock src test tests

rg -n 'WebGLRenderer|WebGPURenderer|EffectComposer|RenderPass|ShaderPass|ShaderMaterial|RawShaderMaterial|NodeMaterial|shadowMap|castShadow|receiveShadow|setRenderTarget|readRenderTargetPixels|setViewport|setScissor|clippingPlanes|toneMapping|outputColorSpace|xr\.' src

rg -n 'Loader|Decoder|Meshopt|KTX2|DRACO|Exporter|Controls|AnimationMixer|KeyframeTrack|Raycaster|dispose\(' src
```

Record:

- resolved Three package version, runtime `THREE.REVISION`, and declaration source;
- all core, add-on, examples, WebGPU, TSL, direct-source, and dynamic imports;
- renderer constructor options, properties, methods, custom subclasses, monkey patches, callbacks, and mutation;
- asset extension and variant, including GLB versus JSON glTF, compression, extensions, external dependencies, skins, morphs, animation, multiple primitives, and texture encodings;
- workers, OffscreenCanvas, XR, audio, physics, framework lifecycle, failure UI, browsers, canvas ownership, and bundler/runtime;
- representative visual baselines, frame-time budget, and memory budget.

Any source other than r185 is **source-version-dependent** until checked against that installation. Three's removed legacy `Geometry` and current EASEL `Geometry` share a name but not an established contract.

## Status ledger

Use one row for each import and another for every relied-on non-default behavior.

| Source import or symbol | Source use | Target symbol and paths checked | Status | Semantic or performance difference | Required proof | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `three/addons/loaders/GLTFLoader.js` | GLB with Draco, skins, and PBR maps | `src/loaders/GLTFLoader.ts`; `_gltf/*` | adapt/unsupported per feature | no automatic source-equivalent decoding and material pipeline | load, animate, render, compare | `UNKNOWN` until run |
| `WebGLRenderer.outputColorSpace` | sRGB output | `src/renderers/Renderer.ts`; texture and rasterizer paths | unsupported | no target color-management or tone-map pass | approved prebaked assets or redesign | pending |

Allowed status values:

- `direct`: the target export and all required behavior are verified;
- `adapt`: the role exists but construction, data, lifecycle, result, appearance, or performance differs;
- `surface-only`: a class or field exists but its required rendering or integration consumer is absent or unverified;
- `unsupported`: inspected target source establishes that the required behavior is outside the CPU/Canvas2D contract;
- `UNKNOWN`: available evidence does not establish the answer.

For `UNKNOWN`, record the exact source symbol and import, source revision, target version, files checked, missing behavior, consequence, and required validation. Absence from `src/index.ts` proves only the absence of a root export; it does not establish a reason.

Example evidence record:

```text
Source: WebGPURenderer.computeAsync (three r185, import three/webgpu)
Target: @xsyetopz/easel 0.7.0
Checked: src/index.ts; src/renderers/Renderer.ts; src/pipeline/
Status: unsupported for the main renderer
Reason: no GPU device or compute lifecycle in the CPU/Canvas2D contract
Consequence: retain a separate compute backend or redesign the simulation
Validation: redesign remains UNKNOWN until approved
```

## Current and historical geometry index APIs

The current 0.7.0 checkout declares a write accessor and a read accessor on `Geometry.index`:

```ts
geometry.index = new Uint16Array([0, 1, 2]);
const current = geometry.index;
geometry.index = undefined;
```

The write accessor accepts `Uint16Array | Uint32Array | number[] | undefined`; a `number[]` containing an index above 65,535 becomes a `Uint32Array`. The current class does not declare `Geometry.setIndex()`.

Commit `d9fa4d0b272f691b8123ce57dd89c2b4be7698cf` introduced the TypeScript class with `setIndex(array): this` and a read-only `index` accessor. Commit `ecf643a7ce6e296464d442acbd242c0364a78a61` replaced that method with the read/write accessor during a broader 0.7.0 API change. The latter commit message does not state why this method changed. The repository's current accessor policy is observable, but treating it as the reason for that historical edit would be an inference.

Inspect the consumer's resolved `dist/index.d.ts` or owning source before choosing either form. Do not rewrite historical code solely from a version label or infer API or maintainer intent from the change.

## Audit completion

The ledger is closed only when every imported symbol and relied-on behavior has a target anchor, status, consequence, proof, and result. A typecheck does not prove rendering, appearance, interaction, asset compatibility, or CPU performance.
