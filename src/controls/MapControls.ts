import { OrbitControls } from "./OrbitControls.ts";

/** Map-style orbit control that constrains panning to the horizontal plane. */
export class MapControls extends OrbitControls {
  /** Creates map controls with horizontal-plane panning enabled by default. */
  constructor(
    camera: ConstructorParameters<typeof OrbitControls>[0],
    domElement: ConstructorParameters<typeof OrbitControls>[1],
  ) {
    super(camera, domElement);
    this.screenSpacePanning = false;
  }
}
