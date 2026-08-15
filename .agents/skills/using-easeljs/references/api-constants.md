# API constants

Source: `src/core/Constants.ts` and root exports at EASEL 0.7.0.

```ts
Side = { Front: 0, Back: 1, Double: 2 }
Shading = { Flat: 0, Gouraud: 1 }
Layer = { GROUND: 0, SCENERY: 1, ENTITY: 2, OVERLAY: 3 }
Wrapping = { ClampToEdge: 0, Repeat: 1, MirroredRepeat: 2 }
BindMode = { Attached: "attached", Detached: "detached" }
LightType = {
  Ambient: 0,
  Hemisphere: 1,
  Directional: 2,
  Point: 3,
  Spot: 4,
  RectArea: 5,
}
MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2, ROTATE: 0, DOLLY: 1, PAN: 2 }
TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 }
TrianglesDrawMode = 0
TriangleStripDrawMode = 1
TriangleFanDrawMode = 2
LinearTransfer = "linear"
SRGBTransfer = "srgb"
NoNormalPacking = ""
NormalRGPacking = "rg"
NormalGAPacking = "ga"
InterpolationSamplingMode = {
  NORMAL: "normal",
  CENTROID: "centroid",
  SAMPLE: "sample",
  FIRST: "first",
  EITHER: "either",
}
InterpolationSamplingType = {
  PERSPECTIVE: "perspective",
  LINEAR: "linear",
  FLAT: "flat",
}
Compatibility = { TEXTURE_COMPARE: "depthTextureCompare" }
```

`ColorManagement` is exported but disabled for the Canvas2D path:
`enabled === false`, `workingColorSpace === "srgb"`, and its conversion
functions return the input unchanged.

Animation constants are owned separately:

```ts
Loop = { Once: 2200, Repeat: 2201, PingPong: 2202 }
AnimationBlend = { Normal: 2500, Additive: 2501 }
Interpolation = { Discrete: 2300, Linear: 2301, Smooth: 2302, Bezier: 2303 }
```
