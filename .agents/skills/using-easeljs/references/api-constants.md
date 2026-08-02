# API constants

Generated from `@xsyetopz/easel@0.6.1` `dist/core/Constants.d.ts`.

```ts
/** Face culling sides. */
export declare const Side: {
    readonly Front: 0;
    readonly Back: 1;
    readonly Double: 2;
};
export type Side = (typeof Side)[keyof typeof Side];
/** Shading models available in the scanline rasterizer. */
export declare const Shading: {
    readonly Flat: 0;
    readonly Gouraud: 1;
};
export type Shading = (typeof Shading)[keyof typeof Shading];
/** Draw order layers within a tile. Higher values draw later (on top). */
export declare const Layer: {
    readonly GROUND: 0;
    readonly SCENERY: 1;
    readonly ENTITY: 2;
    readonly OVERLAY: 3;
};
export type Layer = (typeof Layer)[keyof typeof Layer];
/** Texture UV wrapping modes. */
export declare const Wrapping: {
    readonly ClampToEdge: 0;
    readonly Repeat: 1;
};
export type Wrapping = (typeof Wrapping)[keyof typeof Wrapping];
/** Numeric light type identifiers for fast dispatch in the shading pipeline. */
export declare const LightType: {
    readonly Ambient: 0;
    readonly Hemisphere: 1;
    readonly Directional: 2;
    readonly Point: 3;
    readonly Spot: 4;
};
export type LightType = (typeof LightType)[keyof typeof LightType];
//# sourceMappingURL=Constants.d.ts.map
```
