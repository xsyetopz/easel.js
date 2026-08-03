import { Node } from "../core/Node.ts";
import { Attribute } from "../geometry/Attribute.ts";
import { Geometry } from "../geometry/Geometry.ts";
import type { SpotLight } from "../lights/SpotLight.ts";
import { Vector3 } from "../math/Vector3.ts";
import { LineSegments } from "../objects/LineSegments.ts";

/** Visualises a SpotLight as a cone wireframe. */
export class SpotLightHelper extends Node {
  override type = "SpotLightHelper";

  #light: SpotLight;

  constructor(light: SpotLight) {
    super();

    this.#light = light;
    this.#buildCone();
    this.update();
  }

  #buildCone(): void {
    const segments = 8;
    const positions: number[] = [];

    const angle = this.#light?.angle ?? Math.PI / 6;
    const distance = this.#light?.distance ?? 1;
    const radius = Math.tan(angle) * distance;

    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      positions.push(0, 0, 0, x, -distance, z);
    }

    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2;
      const t1 = ((i + 1) / segments) * Math.PI * 2;
      positions.push(
        Math.cos(t0) * radius,
        -distance,
        Math.sin(t0) * radius,
        Math.cos(t1) * radius,
        -distance,
        Math.sin(t1) * radius,
      );
    }

    const geometry = new Geometry();
    geometry.setAttribute(
      "position",
      new Attribute(new Float32Array(positions), 3),
    );

    for (const child of [...this.children]) {
      this.remove(child);
      if ("geometry" in child) {
        (child as { geometry?: { dispose(): void } }).geometry?.dispose();
      }
    }

    this.add(new LineSegments(geometry));
  }

  update(): void {
    const light = this.#light;
    if (!light) return;
    this.position.copy(light.position);
    if (light.direction) {
      const d = light.direction;
      this.lookAt(
        new Vector3(
          light.position.x + d.x,
          light.position.y + d.y,
          light.position.z + d.z,
        ),
      );
    }
    this.#buildCone();
  }

  dispose(): void {
    for (const child of this.children) {
      if ("geometry" in child) {
        (child as { geometry?: { dispose(): void } }).geometry?.dispose();
      }
    }
  }
}
