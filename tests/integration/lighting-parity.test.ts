import { describe, expect, it } from "bun:test";
import * as THREE from "three";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Shading, Side } from "@/core/Constants.js";
import { Scene } from "@/core/Scene.js";
import { PlaneGeometry } from "@/geometry/primitives/PlaneGeometry.js";
import { AmbientLight } from "@/lights/AmbientLight.js";
import { DirectionalLight } from "@/lights/DirectionalLight.js";
import { HemisphereLight } from "@/lights/HemisphereLight.js";
import type { Light } from "@/lights/Light.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { LambertMaterial } from "@/materials/LambertMaterial.js";
import type { Material } from "@/materials/Material.js";
import { ToonMaterial } from "@/materials/ToonMaterial.js";
import { Vector3 } from "@/math/Vector3.js";
import { Mesh } from "@/objects/Mesh.js";
import { Renderer } from "@/renderers/Renderer.js";
import { Fog } from "@/scenes/Fog.js";

const SIZE = 16;

type Rgb = [number, number, number];

/** three.js Lambert output for one channel: encode(irradiance * diffuse / π + emissive). */
function threeLambert(
  irradiance: THREE.Color,
  diffuse: THREE.Color,
  emissive: THREE.Color = new THREE.Color(0x000000),
): Rgb {
  const linear = new THREE.Color().setRGB(
    Math.min((irradiance.r * diffuse.r) / Math.PI + emissive.r, 1),
    Math.min((irradiance.g * diffuse.g) / Math.PI + emissive.g, 1),
    Math.min((irradiance.b * diffuse.b) / Math.PI + emissive.b, 1),
  );
  const hex = linear.getHex();
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function renderCenter(
  material: Material,
  lights: Light[],
  options: { rotateY?: number; fog?: Fog } = {},
): Rgb {
  let captured: ImageData | undefined;
  const context = {
    imageSmoothingEnabled: true,
    putImageData(imageData: ImageData): void {
      captured = imageData;
    },
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: SIZE,
    height: SIZE,
    isConnected: true,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const renderer = new Renderer({ canvas, width: SIZE, height: SIZE });
  const scene = new Scene();
  scene.background = 0x000000;
  if (options.fog) scene.fog = options.fog;
  const camera = new PerspectiveCamera({
    fov: 50,
    aspect: 1,
    near: 0.1,
    far: 10,
  });
  camera.position.set(0, 0, 3);
  camera.lookAt(new Vector3(0, 0, 0));
  const mesh = new Mesh(new PlaneGeometry(4, 4), material);
  mesh.rotation.y = options.rotateY ?? 0;
  scene.add(mesh);
  for (const light of lights) scene.add(light);
  renderer.prepare(scene, camera);
  renderer.render(scene, camera);
  if (!captured) throw new Error("Renderer did not upload ImageData.");
  const at = ((SIZE / 2) * SIZE + SIZE / 2) * 4;
  return [
    captured.data[at] ?? -1,
    captured.data[at + 1] ?? -1,
    captured.data[at + 2] ?? -1,
  ];
}

/**
 * The per-vertex encode is a 4096-step table lookup; it can land one byte
 * from three.js's exact per-pixel encode.
 */
function expectWithinOneByte(actual: Rgb, expected: Rgb): void {
  for (let channel = 0; channel < 3; channel++) {
    expect(Math.abs(actual[channel] - expected[channel])).toBeLessThanOrEqual(
      1,
    );
  }
}

function frontLight(color = 0xffffff, intensity = 1): DirectionalLight {
  const light = new DirectionalLight(color, intensity);
  light.position.set(0, 0, 1);
  return light;
}

function flatLambert(
  color: number,
  side: number = Side.Front,
): LambertMaterial {
  return new LambertMaterial({ color, shading: Shading.Flat, side });
}

describe("lighting and color parity with three.js r186", () => {
  it("renders a white Lambert plane under DirectionalLight(0xffffff, 1) at 153", () => {
    const pixel = renderCenter(flatLambert(0xffffff), [frontLight()]);
    expect(pixel).toEqual([153, 153, 153]);
    expect(pixel).toEqual(
      threeLambert(new THREE.Color(0xffffff), new THREE.Color(0xffffff)),
    );
  });

  it("renders a 0x808080 Lambert plane at 74", () => {
    const pixel = renderCenter(flatLambert(0x808080), [frontLight()]);
    expect(pixel).toEqual([74, 74, 74]);
    expect(pixel).toEqual(
      threeLambert(new THREE.Color(0xffffff), new THREE.Color(0x808080)),
    );
  });

  it("renders an unlit BasicMaterial hex unchanged", () => {
    expect(renderCenter(new BasicMaterial({ color: 0x6699ff }), [])).toEqual([
      0x66, 0x99, 0xff,
    ]);
  });

  it("matches three.js ambient irradiance with no ambient floor", () => {
    const pixel = renderCenter(flatLambert(0xffffff), [
      new AmbientLight(0x404040, 1),
    ]);
    expect(pixel).toEqual(
      threeLambert(new THREE.Color(0x404040), new THREE.Color(0xffffff)),
    );
    expect(renderCenter(flatLambert(0xffffff), [])).toEqual([0, 0, 0]);
  });

  it("matches three.js hemisphere irradiance mix(ground, sky, 0.5 * dot(N, up) + 0.5)", () => {
    // Normal +Z and default up direction +Y: weight 0.5.
    const pixel = renderCenter(flatLambert(0xffffff), [
      new HemisphereLight(0xff0000, 0x0000ff, 2),
    ]);
    const sky = new THREE.Color(0xff0000);
    const ground = new THREE.Color(0x0000ff);
    const irradiance = new THREE.Color().setRGB(
      (ground.r + (sky.r - ground.r) * 0.5) * 2,
      (ground.g + (sky.g - ground.g) * 0.5) * 2,
      (ground.b + (sky.b - ground.b) * 0.5) * 2,
    );
    expect(pixel).toEqual(threeLambert(irradiance, new THREE.Color(0xffffff)));
  });

  it("lights a visible double-sided back face with the flipped normal", () => {
    // The plane faces away from the camera and the light; three.js flips the
    // back-face normal toward both.
    const lit = threeLambert(
      new THREE.Color(0xffffff),
      new THREE.Color(0xffffff),
    );
    expect(
      renderCenter(flatLambert(0xffffff, Side.Double), [frontLight()], {
        rotateY: Math.PI,
      }),
    ).toEqual(lit);
    expect(
      renderCenter(flatLambert(0xffffff, Side.Back), [frontLight()], {
        rotateY: Math.PI,
      }),
    ).toEqual(lit);
  });

  it("adds emissive after lighting, and renders it with no lights", () => {
    const emissive = new THREE.Color(0x203040);
    const material = new LambertMaterial({
      color: 0x808080,
      emissive: 0x203040,
      emissiveIntensity: 1.5,
      shading: Shading.Flat,
    });
    const scaled = new THREE.Color().setRGB(
      emissive.r * 1.5,
      emissive.g * 1.5,
      emissive.b * 1.5,
    );
    expectWithinOneByte(
      renderCenter(material, [frontLight()]),
      threeLambert(
        new THREE.Color(0xffffff),
        new THREE.Color(0x808080),
        scaled,
      ),
    );
    expectWithinOneByte(
      renderCenter(material, []),
      threeLambert(
        new THREE.Color(0x000000),
        new THREE.Color(0x808080),
        scaled,
      ),
    );
    const toon = new ToonMaterial({ color: 0xffffff, emissive: 0x404040 });
    expect(renderCenter(toon, [])[0]).toBeGreaterThanOrEqual(0x3f);
  });

  it("blends fog in sRGB output space with the hex fog color", () => {
    const fog = new Fog({ color: 0x336699, near: 0, far: 1 }).updateLut();
    expect(
      renderCenter(new BasicMaterial({ color: 0xffffff }), [], { fog }),
    ).toEqual([0x33, 0x66, 0x99]);
  });
});
