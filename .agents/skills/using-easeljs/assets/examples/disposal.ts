// Card: references/lifecycle.md#resource-disposal-ownership
import {
  BasicMaterial,
  BoxGeometry,
  DataTexture,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
} from "@xsyetopz/easel";
import { countDrawnPixels, createStubCanvas, expect } from "./harness.ts";

/** Removes a mesh and frees only what no other mesh still uses. */
export function removeMesh(
  scene: Scene,
  mesh: Mesh,
  stillUsed: (resource: object) => boolean,
): void {
  scene.remove(mesh);
  const { geometry, material } = mesh;
  if (geometry && !stillUsed(geometry)) geometry.dispose();
  if (material instanceof BasicMaterial && !stillUsed(material)) {
    // Material.dispose() does not free its map; dispose textures directly.
    if (material.map && !stillUsed(material.map)) material.map.dispose();
    material.dispose();
  }
}

export function check(): string {
  const stub = createStubCanvas(64, 48);
  const renderer = new Renderer({ width: 64, height: 48, canvas: stub.element });
  const camera = new PerspectiveCamera({ fov: 60, aspect: 64 / 48 });
  camera.position.set(0, 0, 5);
  const scene = new Scene();
  const shared = new BoxGeometry(1, 1, 1);
  const texture = new DataTexture(
    new Uint8ClampedArray(4 * 4 * 4).fill(0xff),
    4,
    4,
  );
  const material = new BasicMaterial({ color: 0xffffff, map: texture });
  const left = new Mesh(shared, material);
  const right = new Mesh(shared, material);
  left.position.x = -1.2;
  right.position.x = 1.2;
  scene.add(left, right);
  const draw = () => {
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    return countDrawnPixels(stub.frame);
  };
  const both = draw();

  // Ownership-aware removal keeps the shared geometry alive.
  removeMesh(scene, left, (r) => r === shared || r === material);
  const oneLeft = draw();

  // Disposing the shared geometry corrupts the mesh still in the scene.
  shared.dispose();
  const afterSharedDispose = draw();

  material.dispose();
  const mapAfterMaterialDispose = texture.data !== undefined;
  texture.dispose();

  expect(both > oneLeft && oneLeft > 0, "right mesh should still render");
  expect(
    afterSharedDispose !== oneLeft,
    "disposing in-use geometry should change the remaining mesh",
  );
  expect(mapAfterMaterialDispose, "material.dispose() leaves map data");
  expect(texture.data === undefined, "texture.dispose() frees its data");
  return `both=${both}px after-remove=${oneLeft}px ` +
    `after-shared-geometry.dispose=${afterSharedDispose}px; ` +
    "map data kept by material.dispose(), freed by texture.dispose()";
}
