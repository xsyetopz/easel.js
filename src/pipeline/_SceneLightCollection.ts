import { LightType } from "../core/Constants.ts";
import type { SphericalHarmonicsCoefficients } from "../math/SphericalHarmonics3.ts";
import type { DrawList } from "./DrawList.ts";
import type { SceneNode, Vec3 } from "./_SceneTraversalShared.ts";

type SceneLight = SceneNode & {
  color?: unknown;
  intensity?: unknown;
  groundColor?: unknown;
  distance?: number;
  decay?: number;
  target?: SceneNode;
  direction?: Vec3;
  angle?: number;
  penumbra?: number;
  cosAngle?: number;
  cosInnerAngle?: number;
  sh: {
    coefficients: SphericalHarmonicsCoefficients;
  };
};

function getSceneLight(light: SceneNode): SceneLight {
  return light as SceneLight;
}

function getWorldPosition(light: SceneNode): Vec3 {
  const elements = light.matrixWorld.elements;
  return { x: elements[12], y: elements[13], z: elements[14] };
}

function normalizeDirection(direction: Vec3): Vec3 {
  const length =
    Math.sqrt(
      direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z,
    ) || 1;
  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
}

function getTargetDirection(target: SceneNode, lightPosition: Vec3): Vec3 {
  const targetWorld = target.matrixWorld.elements;
  return {
    x: targetWorld[12] - lightPosition.x,
    y: targetWorld[13] - lightPosition.y,
    z: targetWorld[14] - lightPosition.z,
  };
}

function buildLightProbeEntry(light: SceneLight): Record<string, unknown> {
  return {
    type: "probe",
    coefficients: light.sh.coefficients,
    intensity: light.intensity,
  };
}

function buildAmbientLightEntry(light: SceneLight): Record<string, unknown> {
  return {
    type: "ambient",
    lightType: LightType.Ambient,
    color: light.color,
    intensity: light.intensity,
  };
}

function buildHemisphereLightEntry(light: SceneNode): Record<string, unknown> {
  const sceneLight = getSceneLight(light);
  const elements = light.matrixWorld.elements;
  const direction = normalizeDirection({
    x: elements[12],
    y: elements[13],
    z: elements[14],
  });
  return {
    type: "hemisphere",
    lightType: LightType.Hemisphere,
    skyColor: sceneLight.color,
    groundColor: sceneLight.groundColor,
    direction,
    intensity: sceneLight.intensity,
  };
}

function buildPointLightEntry(
  light: SceneNode,
  position: Vec3,
): Record<string, unknown> {
  const sceneLight = getSceneLight(light);
  return {
    type: "point",
    lightType: LightType.Point,
    position,
    color: sceneLight.color,
    intensity: sceneLight.intensity,
    distance: sceneLight.distance ?? 0,
    decay: sceneLight.decay ?? 2,
  };
}

function buildDirectionalLightEntry(
  light: SceneNode,
  lightPosition: Vec3,
): Record<string, unknown> | undefined {
  const sceneLight = getSceneLight(light);
  if (sceneLight.color === undefined || sceneLight.intensity === undefined) {
    return;
  }

  const direction = sceneLight.target
    ? getTargetDirection(sceneLight.target, lightPosition)
    : { x: -lightPosition.x, y: -lightPosition.y, z: -lightPosition.z };
  return {
    type: "directional",
    lightType: LightType.Directional,
    direction: normalizeDirection(direction),
    color: sceneLight.color,
    intensity: sceneLight.intensity,
  };
}

/** Collects one scene light and appends its normalized entry to a draw list. */
export function collectLight(light: SceneNode, drawList: DrawList): void {
  const position = getWorldPosition(light);

  const sceneLight = getSceneLight(light);
  if (light.type === "LightProbe") {
    drawList.lights.push(buildLightProbeEntry(sceneLight));
    return;
  }

  if (light.type === "AmbientLight") {
    drawList.lights.push(buildAmbientLightEntry(sceneLight));
    return;
  }

  if (light.type === "HemisphereLight") {
    drawList.lights.push(buildHemisphereLightEntry(light));
    return;
  }

  if (light.type === "SpotLight") {
    drawList.lights.push(buildSpotLightEntry(light));
    return;
  }

  if (light.type === "PointLight") {
    drawList.lights.push(buildPointLightEntry(light, position));
    return;
  }

  const directionalEntry = buildDirectionalLightEntry(light, position);
  if (directionalEntry) {
    drawList.lights.push(directionalEntry);
  }
}

/** Builds the normalized position, direction, and attenuation fields for a spot light. */
export function buildSpotLightEntry(light: SceneNode): Record<string, unknown> {
  const sceneLight = getSceneLight(light);
  const elements = light.matrixWorld.elements;
  const position = {
    x: elements[12],
    y: elements[13],
    z: elements[14],
  };
  const localDirection = sceneLight.direction;
  const direction = sceneLight.target
    ? getTargetDirection(sceneLight.target, position)
    : {
        x:
          elements[0] * (localDirection?.x ?? 0) +
          elements[4] * (localDirection?.y ?? -1) +
          elements[8] * (localDirection?.z ?? 0),
        y:
          elements[1] * (localDirection?.x ?? 0) +
          elements[5] * (localDirection?.y ?? -1) +
          elements[9] * (localDirection?.z ?? 0),
        z:
          elements[2] * (localDirection?.x ?? 0) +
          elements[6] * (localDirection?.y ?? -1) +
          elements[10] * (localDirection?.z ?? 0),
      };
  return {
    type: "spot",
    lightType: LightType.Spot,
    position,
    direction: normalizeDirection(direction),
    color: sceneLight.color,
    intensity: sceneLight.intensity,
    angle: sceneLight.angle,
    penumbra: sceneLight.penumbra ?? 0,
    cosAngle: sceneLight.cosAngle,
    cosInnerAngle: sceneLight.cosInnerAngle,
    distance: sceneLight.distance ?? 0,
    decay: sceneLight.decay ?? 2,
  };
}
