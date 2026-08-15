import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Node } from "../core/Node.ts";
import { Scene } from "../core/Scene.ts";
import type { Geometry } from "../geometry/Geometry.ts";
import { AmbientLight } from "../lights/AmbientLight.ts";
import { DirectionalLight } from "../lights/DirectionalLight.ts";
import { HemisphereLight } from "../lights/HemisphereLight.ts";
import { Light } from "../lights/Light.ts";
import { LightProbe } from "../lights/LightProbe.ts";
import { PointLight } from "../lights/PointLight.ts";
import { SpotLight } from "../lights/SpotLight.ts";
import type { Material } from "../materials/Material.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Group } from "../objects/Group.ts";
import { Mesh } from "../objects/Mesh.ts";
import { SkinnedMesh } from "../objects/SkinnedMesh.ts";
import type { Texture } from "../textures/Texture.ts";
import {
  applyCameraView,
  applySceneState,
  hydrateUuid,
  type ObjectRecord,
  optionalBoolean,
  optionalFiniteNumber,
  optionalRecord,
  optionalString,
  optionalTuple,
  parseSphericalHarmonics,
  resolveMeshResources,
} from "./_ObjectLoaderHelpers.ts";

type ObjectResources = {
  geometries?: Map<string, Geometry>;
  materials?: Map<string, Material>;
  textures?: Map<string, Texture>;
};

/** Recursively builds a concrete node from a JSON object definition. */
export function parseObjectRecord(
  json: ObjectRecord,
  resources: ObjectResources,
): Node {
  const type = optionalString(json, "type", "Node");
  const object = createObject(
    type,
    json,
    resources.geometries,
    resources.materials,
  );
  applyObjectState(object, type, json);
  appendChildren(object, json, resources);
  object.updateMatrix();
  return object;
}

function createObject(
  type: string,
  json: ObjectRecord,
  geometries?: Map<string, Geometry>,
  materials?: Map<string, Material>,
): Node {
  switch (type) {
    case "Node":
      return new Node();
    case "Group":
      return new Group();
    case "Scene": {
      const scene = new Scene();
      applySceneState(scene, json);
      return scene;
    }
    case "PerspectiveCamera":
      return createPerspectiveCamera(json);
    case "OrthographicCamera":
      return createOrthographicCamera(json);
    case "Light":
      return createLight(json);
    case "AmbientLight":
      return createAmbientLight(json);
    case "DirectionalLight":
      return createDirectionalLight(json);
    case "HemisphereLight":
      return createHemisphereLight(json);
    case "PointLight":
      return createPointLight(json);
    case "SpotLight":
      return createSpotLight(json);
    case "LightProbe":
      return createLightProbe(json);
    case "Mesh": {
      const resources = resolveMeshResources(json, geometries, materials);
      return new Mesh(resources.geometry, resources.material);
    }
    case "SkinnedMesh": {
      const resources = resolveMeshResources(json, geometries, materials);
      return new SkinnedMesh(resources.geometry, resources.material);
    }
    default:
      console.warn(`ObjectLoader: unsupported type "${type}", creating Node`);
      return new Node();
  }
}

function createPerspectiveCamera(json: ObjectRecord): PerspectiveCamera {
  const camera = new PerspectiveCamera({
    fov: optionalFiniteNumber(json, "fov", 45),
    aspect: optionalFiniteNumber(json, "aspect", 1),
    near: optionalFiniteNumber(json, "near", 0.1),
    far: optionalFiniteNumber(json, "far", 2000),
    tileSize: optionalFiniteNumber(json, "tileSize", 1),
    zoom: optionalFiniteNumber(json, "zoom", 1),
  });
  camera.focus = optionalFiniteNumber(json, "focus", camera.focus);
  camera.filmGauge = optionalFiniteNumber(json, "filmGauge", camera.filmGauge);
  camera.filmOffset = optionalFiniteNumber(
    json,
    "filmOffset",
    camera.filmOffset,
  );
  applyCameraView(camera, json);
  camera.updateProjectionMatrix();
  return camera;
}

function createOrthographicCamera(json: ObjectRecord): OrthographicCamera {
  const camera = new OrthographicCamera({
    left: optionalFiniteNumber(json, "left", -1),
    right: optionalFiniteNumber(json, "right", 1),
    top: optionalFiniteNumber(json, "top", 1),
    bottom: optionalFiniteNumber(json, "bottom", -1),
    near: optionalFiniteNumber(json, "near", 0.1),
    far: optionalFiniteNumber(json, "far", 2000),
    tileSize: optionalFiniteNumber(json, "tileSize", 1),
    zoom: optionalFiniteNumber(json, "zoom", 1),
  });
  applyCameraView(camera, json);
  return camera;
}

function createLight(json: ObjectRecord): Light {
  return new Light(
    optionalFiniteNumber(json, "color", 0xffffff),
    optionalFiniteNumber(json, "intensity", 1),
  );
}

function createAmbientLight(json: ObjectRecord): AmbientLight {
  return new AmbientLight(
    optionalFiniteNumber(json, "color", 0xffffff),
    optionalFiniteNumber(json, "intensity", 1),
  );
}

function createDirectionalLight(json: ObjectRecord): DirectionalLight {
  return new DirectionalLight(
    optionalFiniteNumber(json, "color", 0xffffff),
    optionalFiniteNumber(json, "intensity", 1),
  );
}

function createHemisphereLight(json: ObjectRecord): HemisphereLight {
  return new HemisphereLight(
    optionalFiniteNumber(json, "color", 0xffffff),
    optionalFiniteNumber(json, "groundColor", 0xffffff),
    optionalFiniteNumber(json, "intensity", 1),
  );
}

function createPointLight(json: ObjectRecord): PointLight {
  return new PointLight(
    optionalFiniteNumber(json, "color", 0xffffff),
    optionalFiniteNumber(json, "intensity", 1),
    optionalFiniteNumber(json, "distance", 0),
    optionalFiniteNumber(json, "decay", 2),
  );
}

function createSpotLight(json: ObjectRecord): SpotLight {
  return new SpotLight(
    optionalFiniteNumber(json, "color", 0xffffff),
    optionalFiniteNumber(json, "intensity", 1),
    optionalFiniteNumber(json, "distance", 0),
    optionalFiniteNumber(json, "angle", Math.PI / 3),
    optionalFiniteNumber(json, "penumbra", 0),
    optionalFiniteNumber(json, "decay", 2),
  );
}

function createLightProbe(json: ObjectRecord): LightProbe {
  return new LightProbe(
    parseSphericalHarmonics(json),
    optionalFiniteNumber(json, "intensity", 1),
  );
}

function applyObjectState(
  object: Node,
  type: string,
  json: ObjectRecord,
): void {
  hydrateUuid(object, json);
  object.name = optionalString(json, "name", object.name);
  object.visible = optionalBoolean(json, "visible", object.visible);
  const userData = optionalRecord(json, "userData");
  if (userData !== undefined) object.userData = userData;
  applyDeferredBindings(object, type, json);
  applyObjectTransform(object, json);
}

function applyDeferredBindings(
  object: Node,
  type: string,
  json: ObjectRecord,
): void {
  if (type === "SkinnedMesh") {
    const skeletonUuid = optionalString(json, "skeleton", "");
    if (skeletonUuid !== "") {
      object.userData = { ...object.userData, skeletonUuid };
    }
  }
  if (type === "DirectionalLight" || type === "SpotLight") {
    const targetUuid = optionalString(json, "target", "");
    if (targetUuid !== "") {
      object.userData = { ...object.userData, targetUuid };
    }
  }
}

function applyObjectTransform(object: Node, json: ObjectRecord): void {
  const position = optionalTuple(json, "position", 3);
  if (position !== undefined) object.position.fromArray(position);
  const scale = optionalTuple(json, "scale", 3);
  if (scale !== undefined) object.scale.fromArray(scale);
  const quaternion = optionalTuple(json, "quaternion", 4);
  if (quaternion !== undefined) {
    object.quaternion.fromArray(quaternion);
    object.rotation.setFromQuaternion(object.quaternion);
  }
  const up = optionalTuple(json, "up", 3);
  if (up !== undefined) object.up.fromArray(up);
  const pivot = optionalTuple(json, "pivot", 3);
  if (pivot !== undefined) object.pivot = new Vector3().fromArray(pivot);
}

function appendChildren(
  object: Node,
  json: ObjectRecord,
  resources: ObjectResources,
): void {
  const children = json.children;
  if (children === undefined) return;
  if (!Array.isArray(children)) {
    throw new TypeError("ObjectLoader: children must be an array.");
  }
  for (const child of children) {
    if (child === null || typeof child !== "object" || Array.isArray(child)) {
      throw new TypeError("ObjectLoader: each child must be a record.");
    }
    object.add(parseObjectRecord(child as ObjectRecord, resources));
  }
}

/** Resolves light target UUIDs to scene-graph node references. */
export function bindLightTargetRecords(
  object: Node,
  lights: Map<string, Light> | Node[],
): void {
  const nodeMap = new Map<string, Node>();
  if (Array.isArray(lights)) {
    for (const node of lights) nodeMap.set(node.uuid, node);
  } else {
    for (const [uuid, light] of lights) nodeMap.set(uuid, light);
  }
  object.traverse((node) => {
    if (!(node instanceof DirectionalLight || node instanceof SpotLight)) {
      return;
    }
    const targetUuid = (node.userData as ObjectRecord).targetUuid;
    if (typeof targetUuid !== "string") return;
    const target = nodeMap.get(targetUuid);
    if (target !== undefined) node.target = target;
  });
}
