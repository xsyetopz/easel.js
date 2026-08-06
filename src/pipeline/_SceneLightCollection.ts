import { LightType } from "../core/Constants.ts";
import type { SphericalHarmonicsCoefficients } from "../math/SphericalHarmonics3.ts";
import { DrawList } from "./DrawList.ts";
import type { SceneNode, Vec3 } from "./_SceneTraversalShared.ts";

export function collectLight(light: SceneNode, drawList: DrawList): void {
  const lightWorld = light.matrixWorld.elements;
  const lightWorldX = lightWorld[12];
  const lightWorldY = lightWorld[13];
  const lightWorldZ = lightWorld[14];

  if (light.type === "LightProbe") {
    const sh = light["sh"] as {
      coefficients: SphericalHarmonicsCoefficients;
    };
    drawList.lights.push({
      type: "probe",
      coefficients: sh.coefficients,
      intensity: light["intensity"],
    });
    return;
  }

  if (light.type === "AmbientLight") {
    drawList.lights.push({
      type: "ambient",
      lightType: LightType.Ambient,
      color: light["color"],
      intensity: light["intensity"],
    });
    return;
  }

  if (light.type === "HemisphereLight") {
    const elements = light.matrixWorld.elements;
    const x = elements[12];
    const y = elements[13];
    const z = elements[14];
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    drawList.lights.push({
      type: "hemisphere",
      lightType: LightType.Hemisphere,
      skyColor: light["color"],
      groundColor: light["groundColor"],
      direction: { x: x / len, y: y / len, z: z / len },
      intensity: light["intensity"],
    });
    return;
  }

  if (light.type === "SpotLight") {
    drawList.lights.push(buildSpotLightEntry(light));
    return;
  }

  if (light.type === "PointLight") {
    drawList.lights.push({
      type: "point",
      lightType: LightType.Point,
      position: { x: lightWorldX, y: lightWorldY, z: lightWorldZ },
      color: light["color"],
      intensity: light["intensity"],
      distance: (light["distance"] as number) ?? 0,
      decay: (light["decay"] as number) ?? 2,
    });
    return;
  }

  if (light["color"] === undefined || light["intensity"] === undefined) {
    return;
  }
  let ddx: number;
  let ddy: number;
  let ddz: number;
  if (light["target"]) {
    const target = light["target"] as SceneNode;
    const targetWorld = target.matrixWorld.elements;
    const twx = targetWorld[12];
    const twy = targetWorld[13];
    const twz = targetWorld[14];
    ddx = twx - lightWorldX;
    ddy = twy - lightWorldY;
    ddz = twz - lightWorldZ;
  } else {
    ddx = -lightWorldX;
    ddy = -lightWorldY;
    ddz = -lightWorldZ;
  }
  const len = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1;
  drawList.lights.push({
    type: "directional",
    lightType: LightType.Directional,
    direction: { x: ddx / len, y: ddy / len, z: ddz / len },
    color: light["color"],
    intensity: light["intensity"],
  });
}

export function buildSpotLightEntry(light: SceneNode): Record<string, unknown> {
  const me = light.matrixWorld.elements;
  const lightWorldX = me[12];
  const lightWorldY = me[13];
  const lightWorldZ = me[14];
  let wdx: number;
  let wdy: number;
  let wdz: number;
  if (light["target"]) {
    const target = light["target"] as SceneNode;
    const targetWorld = target.matrixWorld.elements;
    const twx = targetWorld[12];
    const twy = targetWorld[13];
    const twz = targetWorld[14];
    wdx = twx - lightWorldX;
    wdy = twy - lightWorldY;
    wdz = twz - lightWorldZ;
  } else {
    const dir = light["direction"] as Vec3 | undefined;
    const dx = dir?.x ?? 0;
    const dy = dir?.y ?? -1;
    const dz = dir?.z ?? 0;
    wdx = me[0] * dx + me[4] * dy + me[8] * dz;
    wdy = me[1] * dx + me[5] * dy + me[9] * dz;
    wdz = me[2] * dx + me[6] * dy + me[10] * dz;
  }
  const dirLen = Math.sqrt(wdx * wdx + wdy * wdy + wdz * wdz) || 1;
  return {
    type: "spot",
    lightType: LightType.Spot,
    position: { x: lightWorldX, y: lightWorldY, z: lightWorldZ },
    direction: { x: wdx / dirLen, y: wdy / dirLen, z: wdz / dirLen },
    color: light["color"],
    intensity: light["intensity"],
    angle: light["angle"],
    penumbra: (light["penumbra"] as number) ?? 0,
    cosAngle: light["cosAngle"],
    cosInnerAngle: light["cosInnerAngle"],
    distance: (light["distance"] as number) ?? 0,
    decay: (light["decay"] as number) ?? 2,
  };
}
