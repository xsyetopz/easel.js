# API lookup from source

This card covers finding exact export names, signatures, and constant
values. The skill ships no hand-typed API catalog, because such lists
drift from `src/index.ts`. The script `scripts/easel_api.ts` reads the
source (or an installed package) and prints what exists now. Its
self-test is `scripts/test_easel_api.ts`, which
`sh assets/examples/verify.sh api` runs (tier: Executed).

## Look up exports and signatures

**Definition.** `bun scripts/easel_api.ts MODE [NAME...] [--root DIR]`
has three modes:

- `exports [--grep TEXT]` parses every `export` statement in
  `DIR/src/index.ts`. That covers `export { … } from`, `export type { … }`,
  inline `type` modifiers, `a as b` aliases, and `export const REVISION`.
  It prints the names grouped by source module, with values and types
  separated. It also compares the parsed value names with
  `Object.keys(await import(index))` and exits 1 on any mismatch or any
  export statement it cannot parse. `--grep TEXT` keeps entries whose
  name or module path contains `TEXT`, case-insensitively. It is a
  substring match, not a regex: `a|b` is split into alternatives, but
  `^`, `.*` and other regex syntax match literally and usually find
  nothing.
- `show NAME...` prints the emitted `.d.ts` declaration of each root
  export, including overloads and JSDoc. When DIR is a repository (it has
  `tsconfig.build.json` and `src/index.ts`), it always emits declarations
  with DIR's `tsc -p tsconfig.build.json` into a temporary directory,
  because a repository's `dist/` can be stale. An installed package
  without `tsconfig.build.json` is read from `DIR/dist`. An unknown name
  exits 1.
- `constants [NAME...]` prints exported plain objects, numbers, and
  strings as JSON.

`DIR` defaults to the repository that contains the skill. For an app,
pass `--root node_modules/@xsyetopz/easel`; the npm package ships both
`src/` and `dist/`. Exit status: 0 success, 1 unknown name or mismatch,
2 bad usage.

**Use when.**

- Before writing or quoting any EASEL name or call shape that no card
  here shows.
- To check whether a three.js name exists at all. `show WebGLRenderer`
  exits 1.

**Do not use when.**

- You need to know how EASEL differs from three.js r186 member by member.
  Read `api-comparison/three-core.txt` in the repository, whose state
  column marks entries as `=`, `<`, `>`, or `!`. For a whole-project port,
  use the sibling `threejs-to-easeljs` skill.

**Example.**

```sh
bun scripts/easel_api.ts exports --grep "loader|exporter"
bun scripts/easel_api.ts show OBJLoader Track
bun scripts/easel_api.ts constants Side Loop Interpolation
bun scripts/easel_api.ts exports --root node_modules/@xsyetopz/easel
```

The output of `show Renderer` from this repository, trimmed to members:

```ts
export declare class Renderer {
    sortObjects: boolean;
    constructor(options?: RendererOptions);
    get domElement(): HTMLCanvasElement | undefined;
    get width(): number;
    get height(): number;
    prepare(scene: Scene, camera: Camera, force?: boolean): void;
    render(scene: Scene, camera: Camera, timings?: RenderTimings): void;
    setSize(width: number, height: number): void;
    get clearColor(): number;
    set clearColor(value: Color | number);
    dispose(): void;
}
```

Runnable: `scripts/easel_api.ts`.

**Cost removed.** Invented or outdated API names. Local run (macOS arm64,
Bun 1.4.2, tsc 7.0.2): `exports` reported 405 value exports and 243
type-only exports at `REVISION` 0.7.0 with no runtime mismatch. The same
cross-check against the published `@xsyetopz/easel@0.7.0` npm package
also passed.

**Verify.**

1. `sh assets/examples/verify.sh api` passes all checks. It exercises
   the parser on fixtures and checks exit codes 0, 1, and 2 against the
   real source.
1. `bun scripts/easel_api.ts exports >/dev/null; echo $?` prints `0`.
1. `bun scripts/easel_api.ts exports --grep "OBJLoader|GCodeExporter"`
   lists both modules.
