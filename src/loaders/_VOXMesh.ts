import { Mesh } from "../objects/Mesh.ts";
import type { VOXChunk } from "./VOXLoader.ts";
import { buildMesh } from "./_VOXMeshing.ts";

/** CPU compatibility wrapper matching THREE.VOXMesh without GPU resources.
 * @deprecated Use {@link buildMesh} when a named helper is preferable.
 */
export class VOXMesh extends Mesh {
  /** Constructs a mesh from one decoded VOX chunk. */
  constructor(chunk: VOXChunk) {
    const mesh = buildMesh(chunk);
    super(mesh.geometry, mesh.material);
  }
}
