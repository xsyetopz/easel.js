# Loaders

Scope: `src/loaders/`; format tests live in `tests/loaders/`, and sample inputs live in `assets/` or `fixtures/` with their licenses.

## Ownership map
- `Loader.ts`, `LoadingManager.ts`, `FileLoader.ts`, `Cache.ts`, and `LoaderUtils.ts` own shared configuration, request lifecycle, URL resolution, caching, progress, errors, and cancellation.
- Each public format file owns decoding and diagnostics for that format; `_gltf/` contains private GLTF parsing stages used by `GLTFLoader.ts`.
- `src/index.ts` owns public loader exports and each loader's JSDoc owns generated API documentation.

## Change rules
- Preserve callback and `loadAsync` behavior, manager `itemStart`/`itemEnd`/`itemError` balance, credential/header semantics, cache keys, and abort cleanup.
- Validate unknown external data at parser boundaries and keep useful format/path context in errors.
- Add focused success, malformed-input, and lifecycle tests; reuse licensed fixtures rather than embedding unexplained third-party data.
- Run `bun test tests/loaders`, `bun run typecheck`, and public API/doc checks when exports or declarations change.
