# Loaders and serialization

Loader exports:

- `Loader`
- `LoadingManager`, `DefaultLoadingManager`
- `FileLoader`
- `ImageLoader`
- `ImageBitmapLoader`
- `TextureLoader`
- `DataTextureLoader`
- `GeometryLoader`
- `MaterialLoader`
- `ObjectLoader`
- `AnimationLoader`

Recipe when loading behavior matters:

1. Inspect the exact loader `.d.ts` file.
2. Confirm callback/promise shape from types/source.
3. Keep app-level loading wrappers typed.
4. Convert image/canvas data to `DataTexture` when manual pixel control is
   needed.

Manual texture loading is often clearer for agents than guessing loader callback
APIs:

```ts
const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
});
```
