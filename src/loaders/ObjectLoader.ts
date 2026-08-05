import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Node, type NodeJSON } from "../core/Node.ts";
import { Scene } from "../core/Scene.ts";
import { AmbientLight } from "../lights/AmbientLight.ts";
import { DirectionalLight } from "../lights/DirectionalLight.ts";
import { HemisphereLight } from "../lights/HemisphereLight.ts";
import { Light } from "../lights/Light.ts";
import { LightProbe } from "../lights/LightProbe.ts";
import { PointLight } from "../lights/PointLight.ts";
import { SpotLight } from "../lights/SpotLight.ts";
import { SphericalHarmonics3 } from "../math/SphericalHarmonics3.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Group } from "../objects/Group.ts";
import { Fog, FogExp2 } from "../scenes/Fog.ts";
import { FileLoader } from "./FileLoader.ts";
import { Loader } from "./Loader.ts";
import type { LoadingManager } from "./LoadingManager.ts";

type ObjectRecord = Record<string, unknown>;

function optionalFiniteNumber(
  json: ObjectRecord,
  key: string,
  fallback: number,
): number {
  const value = json[key];
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`ObjectLoader: ${key} must be a finite number.`);
  }
  return value;
}

function requiredFiniteNumber(json: ObjectRecord, key: string): number {
  const value = json[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`ObjectLoader: ${key} must be a finite number.`);
  }
  return value;
}

function optionalBoolean(
  json: ObjectRecord,
  key: string,
  fallback: boolean,
): boolean {
  const value = json[key];
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new TypeError(`ObjectLoader: ${key} must be a boolean.`);
  }
  return value;
}

function optionalString(
  json: ObjectRecord,
  key: string,
  fallback: string,
): string {
  const value = json[key];
  if (value === undefined) return fallback;
  if (typeof value !== "string") {
    throw new TypeError(`ObjectLoader: ${key} must be a string.`);
  }
  return value;
}

function optionalTuple(
  json: ObjectRecord,
  key: string,
  length: number,
): number[] | undefined {
  const value = json[key];
  if (value === undefined) return;
  if (
    !Array.isArray(value) ||
    value.length !== length ||
    value.some(
      (component) =>
        typeof component !== "number" || !Number.isFinite(component),
    )
  ) {
    throw new TypeError(
      `ObjectLoader: ${key} must contain ${length} finite numbers.`,
    );
  }
  return value;
}

function optionalRecord(
  json: ObjectRecord,
  key: string,
): ObjectRecord | undefined {
  const value = json[key];
  if (value === undefined) return;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`ObjectLoader: ${key} must be a record.`);
  }
  return value as ObjectRecord;
}

function hydrateUuid(object: Node, json: ObjectRecord): void {
  const uuid = json["uuid"];
  if (uuid === undefined) return;
  if (typeof uuid !== "string") {
    throw new TypeError("ObjectLoader: uuid must be a string.");
  }
  Object.defineProperty(object, "uuid", {
    value: uuid,
    enumerable: true,
    writable: false,
  });
}

function parseSphericalHarmonics(json: ObjectRecord): SphericalHarmonics3 {
  const sh = optionalTuple(json, "sh", 27);
  if (sh === undefined) {
    throw new TypeError("ObjectLoader: LightProbe requires 27 SH components.");
  }
  return new SphericalHarmonics3().fromArray(sh);
}

function applySceneState(scene: Scene, json: ObjectRecord): void {
  const background = json["background"];
  if (background !== undefined) {
    if (typeof background !== "number" || !Number.isFinite(background)) {
      throw new TypeError(
        "ObjectLoader: texture backgrounds require an explicit texture resource context.",
      );
    }
    scene.background = background;
  }

  const fog = optionalRecord(json, "fog");
  if (fog === undefined) return;
  const type = optionalString(fog, "type", "Fog");
  const color = requiredFiniteNumber(fog, "color");
  const far = requiredFiniteNumber(fog, "far");
  if (type === "FogExp2") {
    scene.fog = new FogExp2(color, requiredFiniteNumber(fog, "density"), far);
  } else if (type === "Fog") {
    scene.fog = new Fog({
      color,
      near: requiredFiniteNumber(fog, "near"),
      far,
    });
  } else {
    throw new TypeError(`ObjectLoader: unsupported fog type "${type}".`);
  }
  scene.fog.name = optionalString(fog, "name", "");
}

function applyCameraView(
  object: PerspectiveCamera | OrthographicCamera,
  json: ObjectRecord,
): void {
  const view = optionalRecord(json, "view");
  if (view === undefined) return;
  const fullWidth = requiredFiniteNumber(view, "fullWidth");
  const fullHeight = requiredFiniteNumber(view, "fullHeight");
  const offsetX = requiredFiniteNumber(view, "offsetX");
  const offsetY = requiredFiniteNumber(view, "offsetY");
  const width = requiredFiniteNumber(view, "width");
  const height = requiredFiniteNumber(view, "height");
  object.setViewOffset(fullWidth, fullHeight, offsetX, offsetY, width, height);
  if (!optionalBoolean(view, "enabled", true)) object.clearViewOffset();
}

/** Loads a JSON scene graph and returns a Node hierarchy. */
export class ObjectLoader extends Loader {
  /** Constructs a scene-graph loader bound to a LoadingManager. */
  constructor(manager: LoadingManager | undefined = void 0) {
    super(manager);
  }

  /** Loads a scene graph from a JSON resource. */
  override load(
    url: string,
    onLoad?: (node: Node) => void,
    onProgress: ((event: ProgressEvent) => void) | undefined = void 0,
    onError: ((err: unknown) => void) | undefined = void 0,
  ): void {
    const fileLoader = new FileLoader(this.manager);
    fileLoader.cache = this.cache;
    fileLoader.path = this.path;
    fileLoader.responseType = "json";
    fileLoader.requestHeader = this.requestHeader;

    fileLoader.load(
      url,
      (json) => {
        onLoad?.(this.parse(json as ObjectRecord));
      },
      onProgress,
      onError,
    );
  }

  /** Parses a canonical EASEL node record. */
  parse(json: NodeJSON | ObjectRecord): Node {
    return this.#parseObject(json as ObjectRecord);
  }

  /** Recursively builds a concrete node from a JSON object definition. */
  #parseObject(json: ObjectRecord): Node {
    const type = optionalString(json, "type", "Node");
    let object: Node;

    switch (type) {
      case "Node":
        object = new Node();
        break;
      case "Group":
        object = new Group();
        break;
      case "Scene": {
        const scene = new Scene();
        applySceneState(scene, json);
        object = scene;
        break;
      }
      case "PerspectiveCamera": {
        const camera = new PerspectiveCamera({
          fov: optionalFiniteNumber(json, "fov", 45),
          aspect: optionalFiniteNumber(json, "aspect", 1),
          near: optionalFiniteNumber(json, "near", 0.1),
          far: optionalFiniteNumber(json, "far", 2000),
          tileSize: optionalFiniteNumber(json, "tileSize", 1),
          zoom: optionalFiniteNumber(json, "zoom", 1),
        });
        camera.focus = optionalFiniteNumber(json, "focus", camera.focus);
        camera.filmGauge = optionalFiniteNumber(
          json,
          "filmGauge",
          camera.filmGauge,
        );
        camera.filmOffset = optionalFiniteNumber(
          json,
          "filmOffset",
          camera.filmOffset,
        );
        applyCameraView(camera, json);
        camera.updateProjectionMatrix();
        object = camera;
        break;
      }
      case "OrthographicCamera": {
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
        object = camera;
        break;
      }
      case "Light":
        object = new Light(
          optionalFiniteNumber(json, "color", 0xffffff),
          optionalFiniteNumber(json, "intensity", 1),
        );
        break;
      case "AmbientLight":
        object = new AmbientLight(
          optionalFiniteNumber(json, "color", 0xffffff),
          optionalFiniteNumber(json, "intensity", 1),
        );
        break;
      case "DirectionalLight":
        object = new DirectionalLight(
          optionalFiniteNumber(json, "color", 0xffffff),
          optionalFiniteNumber(json, "intensity", 1),
        );
        break;
      case "HemisphereLight":
        object = new HemisphereLight(
          optionalFiniteNumber(json, "color", 0xffffff),
          optionalFiniteNumber(json, "groundColor", 0xffffff),
          optionalFiniteNumber(json, "intensity", 1),
        );
        break;
      case "PointLight":
        object = new PointLight(
          optionalFiniteNumber(json, "color", 0xffffff),
          optionalFiniteNumber(json, "intensity", 1),
          optionalFiniteNumber(json, "distance", 0),
          optionalFiniteNumber(json, "decay", 2),
        );
        break;
      case "SpotLight":
        object = new SpotLight(
          optionalFiniteNumber(json, "color", 0xffffff),
          optionalFiniteNumber(json, "intensity", 1),
          optionalFiniteNumber(json, "distance", 0),
          optionalFiniteNumber(json, "angle", Math.PI / 3),
          optionalFiniteNumber(json, "penumbra", 0),
          optionalFiniteNumber(json, "decay", 2),
        );
        break;
      case "LightProbe":
        object = new LightProbe(
          parseSphericalHarmonics(json),
          optionalFiniteNumber(json, "intensity", 1),
        );
        break;
      default:
        console.warn(`ObjectLoader: unsupported type "${type}", creating Node`);
        object = new Node();
        break;
    }

    hydrateUuid(object, json);
    object.name = optionalString(json, "name", object.name);
    object.visible = optionalBoolean(json, "visible", object.visible);

    const userData = optionalRecord(json, "userData");
    if (userData !== undefined) object.userData = userData;

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

    const children = json["children"];
    if (children !== undefined) {
      if (!Array.isArray(children)) {
        throw new TypeError("ObjectLoader: children must be an array.");
      }
      for (const child of children) {
        if (
          child === null ||
          typeof child !== "object" ||
          Array.isArray(child)
        ) {
          throw new TypeError("ObjectLoader: each child must be a record.");
        }
        object.add(this.#parseObject(child as ObjectRecord));
      }
    }

    object.updateMatrix();
    return object;
  }
}
