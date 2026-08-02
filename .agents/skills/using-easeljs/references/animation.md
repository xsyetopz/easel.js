# Animation

Read this for clips, tracks, animator updates, named node bindings, grouped
voxel rigs, and step interpolation.

## Contents

- [Clips and tracks](#clips-and-tracks)
- [Hierarchical voxel rigging](#hierarchical-voxel-rigging)
- [Complete example: animated cube](#complete-example-animated-cube)
- [Complete example: step-interpolated voxel rig](#complete-example-step-interpolated-voxel-rig)

## Clips and tracks

Animation exports:

- `AnimationClip`
- `Animator`
- `Track`
- `BooleanTrack`, `ColorTrack`, `NumberTrack`, `QuaternionTrack`, `VectorTrack`
- `AnimationAction`
- `LoopOnce`, `LoopPingPong`, `LoopRepeat`

Clip recipe:

```ts
const track = new EASEL.Track(
	"Cube.rotation.y",
	new Float32Array([0, 1]),
	new Float32Array([0, Math.PI * 2]),
	1,
);
const clip = new EASEL.AnimationClip("spin", 1, [track]);
const animator = new EASEL.Animator(scene);
animator.clipAction(clip).setLoop(EASEL.LoopRepeat, Infinity).play();
```

Frame update:

```ts
animator.update(dt);
```

Step animation is implemented by the `StepTrack` subclass in the complete
voxel-rig example below; keep the override there as the complete
implementation.

Track names resolve node paths and properties. Name scene nodes explicitly
before binding animation tracks.

## Hierarchical voxel rigging

Use this pattern for blocky characters or articulated voxel props built from
grouped cuboid parts.

Pattern:

- Model root is a `Group`.
- Each joint is a named `Group`.
- Cuboid body parts are manual `Geometry` meshes parented under joints.
- One shared `BasicMaterial` with skin `DataTexture` is reused across parts.
- Animation uses `Animator`, `AnimationClip`, and `Track` names that match joint
  properties.
- Step animation can be implemented by subclassing `Track.interpolate` when
  discrete frames are required.

Skeleton recipe:

```ts
const root = new EASEL.Group();
root.name = "Player";
const arm = new EASEL.Group();
arm.name = "RightArm";
root.add(arm);
const animator = new EASEL.Animator(root);
```

## Complete example: animated cube

```ts
import * as EASEL from "@xsyetopz/easel";

export function createAnimatedCube() {
	const cube = new EASEL.Mesh(
		new EASEL.BoxGeometry(1, 1, 1),
		new EASEL.LambertMaterial({
			color: 0x44aaff,
			shading: EASEL.Shading.Gouraud,
		}),
	);
	cube.name = "Cube";
	const track = new EASEL.Track(
		"Cube.rotation.y",
		[0, 1],
		[0, Math.PI * 2],
		1,
	);
	const clip = new EASEL.AnimationClip("spin", 1, [track]);
	const root = new EASEL.Group();
	root.add(cube);
	const animator = new EASEL.Animator(root);
	animator
		.clipAction(clip)
		.setLoop(EASEL.LoopRepeat, Number.POSITIVE_INFINITY)
		.play();
	return { root, cube, animator };
}
```

## Complete example: step-interpolated voxel rig

```ts
import * as EASEL from "@xsyetopz/easel";

class StepTrack extends EASEL.Track {
	override interpolate(index: number): number[] {
		const offset = index * this.itemSize;
		return Array.from(this.values.subarray(offset, offset + this.itemSize));
	}
}

export function makeTwoJointModel(texture: EASEL.DataTexture) {
	const material = new EASEL.BasicMaterial({
		map: texture,
		side: EASEL.Side.Front,
	});
	const root = new EASEL.Group();
	root.name = "Root";
	const arm = new EASEL.Group();
	arm.name = "Arm";
	arm.position.set(0.6, 0.8, 0);
	arm.add(new EASEL.Mesh(new EASEL.BoxGeometry(0.25, 0.8, 0.25), material));
	root.add(arm);
	const track = new StepTrack(
		"Arm.rotation.z",
		[0, 0.5, 1],
		[0.4, -0.4, 0.4],
		1,
	);
	const clip = new EASEL.AnimationClip("wave", 1, [track]);
	const animator = new EASEL.Animator(root);
	animator
		.clipAction(clip)
		.setLoop(EASEL.LoopRepeat, Number.POSITIVE_INFINITY)
		.play();
	return { root, animator };
}
```
