# Materials and lighting

Read this for material options, side/shading/layer behavior, discrete opacity,
lights, and fog/background precedence.

## Contents

- [Materials](#materials)
- [Lights and fog](#lights-and-fog)
- [Complete example: fog and lighting setup](#complete-example-fog-and-lighting-setup)

## Materials

Base `Material` fields:

- `layer`: draw order within tile; higher draws later
- `opacity`: discrete translucency, 0 opaque through 8 nearly transparent
- `shading`: `Shading.Flat` or `Shading.Gouraud`
- `side`: `Side.Front`, `Side.Back`, or `Side.Double`
- `visible`
- `needsUpdate`

Material classes:

- `BasicMaterial`: solid or textured, not lit
- `LambertMaterial`: diffuse lighting from scene lights
- `ToonMaterial`: toon-styled material
- `LineMaterial`, `DashedLineMaterial`, `PointsMaterial`

Options common to `BasicMaterial` and `LambertMaterial`:

```ts
{
 color?: EASEL.Color | number | string;
 map?: EASEL.Texture;
 layer?: number;
 opacity?: number;
 transparent?: boolean;
 shading?: number;
 side?: number;
}
```

Flat textured material:

```ts
const material = new EASEL.BasicMaterial({
	map: atlas,
	side: EASEL.Side.Front,
	shading: EASEL.Shading.Flat,
});
```

Lit material:

```ts
const material = new EASEL.LambertMaterial({
	color: 0xffffff,
	shading: EASEL.Shading.Gouraud,
});
```

Transparent pass pattern:

```ts
const water = new EASEL.BasicMaterial({
	map: atlas,
	side: EASEL.Side.Front,
	shading: EASEL.Shading.Flat,
	transparent: true,
});
water.opacity = 3;
```

Set `transparent: true` to enable blending; `opacity` alone does not blend.
Opacity is discrete and inverted relative to a usual alpha value: `0` is fully
opaque and `8` is nearly transparent. For an approximate THREE.js alpha `alpha`
in the usual `0..1` scale, use `Math.round((1 - alpha) * 8)` and visually verify
the result.

## Lights and fog

Light exports:

- `AmbientLight`
- `DirectionalLight`
- `HemisphereLight`
- `PointLight`
- `SpotLight`
- helpers: `DirectionalLightHelper`, `PointLightHelper`, `SpotLightHelper`

Use lights with lit materials such as `LambertMaterial`. `BasicMaterial` is
unlit.

Scene lighting recipe:

```ts
scene.add(new EASEL.AmbientLight(0xffffff, 0.35));
const sun = new EASEL.DirectionalLight(0xffffff, 0.8);
sun.position.set(1, 2, 1);
scene.add(sun);
```

Fog constructor:

```ts
new EASEL.Fog({ color?: EASEL.Color | number | string, near?: number, far?: number, density?: number })
```

Fog recipe:

```ts
scene.fog = new EASEL.Fog({ color: 0x000000, near: 12, far: 48, density: 2.5 });
scene.background = 0x000000;
```

Fog is applied during render pipeline culling/blending. Tune `near`, `far`, and
`density` for scene scale.

Fog also controls the initial framebuffer clear: when `scene.fog` is present,
its color overrides `scene.background`, including a screen-space `Texture`.

## Complete example: fog and lighting setup

```ts
import * as EASEL from "@xsyetopz/easel";

export function addFogAndLights(scene: EASEL.Scene): void {
	scene.background = 0x05070a;
	scene.fog = new EASEL.Fog({
		color: 0x05070a,
		near: 10,
		far: 48,
		density: 2.5,
	});
	scene.add(new EASEL.AmbientLight(0xffffff, 0.3));
	const sun = new EASEL.DirectionalLight(0xffffff, 0.8);
	sun.position.set(1, 2, 1);
	scene.add(sun);
}
```
