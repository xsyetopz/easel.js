---
title: "Install EASEL.js"
description: "Add EASEL.js to a Bun, npm, or JSR project and load it as an ES module."
sidebar:
  order: 2
  label: "Install"
---

EASEL.js is published as the `@xsyetopz/easel` package. Use the package
manager already used by your application:

```sh
bun add @xsyetopz/easel
```

```sh
npm install @xsyetopz/easel
```

The package is also available through JSR:

```sh
bunx jsr add @xsyetopz/easel
```

Import the library as an ES module. In a browser build, provide a Canvas2D
element to the renderer or let it create one for you.

```ts
import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("A canvas element is required.");
}

const renderer = new EASEL.Renderer({
  canvas,
  width: 640,
  height: 360,
});
```

The renderer writes `ImageData` to Canvas2D. A browser that does not provide a
2D context cannot display a scene, but the scene graph and API modules remain
usable for non-rendering work.

## Related API

- [Renderer](/docs/renderers/Renderer/)
- [RendererOptions](/docs/renderers/RendererOptions/)

## Try an example

[Open the examples](/examples/) to compare a working browser setup with your
own entry point.
