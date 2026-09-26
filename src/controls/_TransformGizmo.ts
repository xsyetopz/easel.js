import { OrthographicCamera } from "../cameras/OrthographicCamera.ts";
import type { PerspectiveCamera } from "../cameras/PerspectiveCamera.ts";
import { Layer } from "../core/Constants.ts";
import { Node } from "../core/Node.ts";
import type { Intersection, Raycaster } from "../core/Raycaster.ts";
import { Geometry } from "../geometry/Geometry.ts";
import { BoxGeometry } from "../geometry/primitives/BoxGeometry.ts";
import { CylinderGeometry } from "../geometry/primitives/CylinderGeometry.ts";
import { OctahedronGeometry } from "../geometry/primitives/OctahedronGeometry.ts";
import { SphereGeometry } from "../geometry/primitives/SphereGeometry.ts";
import { TorusGeometry } from "../geometry/primitives/TorusGeometry.ts";
import { BasicMaterial } from "../materials/BasicMaterial.ts";
import { LineMaterial } from "../materials/LineMaterial.ts";
import { Color } from "../math/Color.ts";
import { Euler } from "../math/Euler.ts";
import { Matrix4 } from "../math/Matrix4.ts";
import { Quaternion } from "../math/Quaternion.ts";
import { Vector3 } from "../math/Vector3.ts";
import { Line } from "../objects/Line.ts";
import { Mesh } from "../objects/Mesh.ts";

/** Transformation applied by a {@link TransformControls} gesture. */
export type TransformMode = "translate" | "rotate" | "scale";

/** Coordinate space of the transform handles. */
export type TransformSpace = "world" | "local";

/**
 * Name of a transform handle: a single axis, an axis plane, `XYZ` for the
 * uniform handle, `E` for the view-aligned rotation ring, or `XYZE` for the
 * free-rotation trackball.
 */
export type TransformAxis =
  | "X"
  | "Y"
  | "Z"
  | "E"
  | "XY"
  | "YZ"
  | "XZ"
  | "XYZ"
  | "XYZE";

/** Camera accepted by {@link TransformControls}. */
export type TransformCamera = PerspectiveCamera | OrthographicCamera;

/** Controls state read by the gizmo on each world-matrix update. */
export interface TransformGizmoState {
  readonly camera: TransformCamera;
  readonly enabled: boolean;
  readonly axis: TransformAxis | undefined;
  readonly mode: TransformMode;
  readonly space: TransformSpace;
  readonly size: number;
  readonly dragging: boolean;
  readonly showX: boolean;
  readonly showY: boolean;
  readonly showZ: boolean;
  readonly showXY: boolean;
  readonly showYZ: boolean;
  readonly showXZ: boolean;
  readonly showXYZE: boolean;
  readonly showE: boolean;
  readonly worldPosition: Vector3;
  readonly worldPositionStart: Vector3;
  readonly worldQuaternion: Quaternion;
  readonly worldQuaternionStart: Quaternion;
  readonly cameraPosition: Vector3;
  readonly rotationAxis: Vector3;
  readonly eye: Vector3;
}

/** Shared gizmo material with the base color and opacity restored each update. */
interface GizmoMaterial {
  readonly material: BasicMaterial | LineMaterial;
  readonly color: Color;
  opacity: number;
}

/** Materials recolored by `TransformControls.setColors()`. */
export interface TransformMaterialLib {
  readonly xAxis: GizmoMaterial;
  readonly yAxis: GizmoMaterial;
  readonly zAxis: GizmoMaterial;
  readonly active: GizmoMaterial;
  readonly xAxisTransparent: GizmoMaterial;
  readonly yAxisTransparent: GizmoMaterial;
  readonly zAxisTransparent: GizmoMaterial;
  readonly activeTransparent: GizmoMaterial;
}

/** One gizmo, picker, or helper handle. */
interface Handle {
  readonly node: Mesh | Line;
  readonly name: string;
  readonly tag: "helper" | undefined;
  readonly material: GizmoMaterial;
}

type Triple = readonly [number, number, number];

/** One entry of a three.js-style gizmo definition. */
type HandleDefinition = readonly [
  create: () => Geometry,
  material: GizmoMaterial,
  kind: "mesh" | "line",
  position?: Triple | undefined,
  rotation?: Triple | undefined,
  scale?: Triple | undefined,
  tag?: "helper",
];

type GizmoDefinition = Readonly<Record<string, readonly HandleDefinition[]>>;

const _tempEuler = new Euler();
const _alignVector = new Vector3(0, 1, 0);
const _zeroVector = new Vector3(0, 0, 0);
const _lookAtMatrix = new Matrix4();
const _tempQuaternion = new Quaternion();
const _tempQuaternion2 = new Quaternion();
const _identityQuaternion = new Quaternion();
const _tempVector = new Vector3();
const _unitX = new Vector3(1, 0, 0);
const _unitY = new Vector3(0, 1, 0);
const _unitZ = new Vector3(0, 0, 1);
const _bakePosition = new Vector3();
const _bakeQuaternion = new Quaternion();
const _bakeScale = new Vector3();
const _bakeMatrix = new Matrix4();
const _hits: Intersection[] = [];

const AXIS_HIDE_THRESHOLD = 0.99;
const PLANE_HIDE_THRESHOLD = 0.2;

/** Converts a three.js opacity in [0, 1] to EASEL's discrete translucency level. */
function translucency(opacity: number): number {
  return Math.round((1 - opacity) * 8);
}

function gizmoMaterial(
  kind: "mesh" | "line",
  color: number,
  opacity: number,
): GizmoMaterial {
  const options = {
    color,
    layer: Layer.OVERLAY,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: translucency(opacity),
  };
  const material =
    kind === "mesh"
      ? new BasicMaterial(options)
      : new LineMaterial({ ...options, linewidth: 2 });
  return { material, color: new Color(color), opacity };
}

function positions(values: number[]): Geometry {
  return new Geometry().setPositions(new Float32Array(values));
}

/** Arc in the XY plane rotated like the three.js gizmo `CircleGeometry()`. */
function circle(radius: number, arc: number): () => Geometry {
  return () => {
    const segments = Math.max(8, Math.round(64 * arc));
    const values: number[] = [];
    for (let index = 0; index <= segments; index++) {
      const angle = (index / segments) * arc * Math.PI * 2;
      values.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }
    return positions(values)
      .rotateY(Math.PI / 2)
      .rotateX(Math.PI / 2);
  };
}

const arrow = (): Geometry =>
  new CylinderGeometry(0, 0.04, 0.1, 8).translate(0, 0.05, 0);
const scaleHandle = (): Geometry =>
  new BoxGeometry(0.08, 0.08, 0.08).translate(0, 0.04, 0);
const shaft = (): Geometry => positions([0, 0, 0, 0, 0.5, 0]);
const axisLine = (): Geometry => positions([0, 0, 0, 1, 0, 0]);
const deltaLine = (): Geometry => positions([0, 0, 0, 1, 1, 1]);
const planeHandle = (): Geometry => new BoxGeometry(0.15, 0.15, 0.01);
const pickerArrow = (): Geometry => new CylinderGeometry(0.2, 0, 0.6, 4);
const pickerPlane = (): Geometry => new BoxGeometry(0.2, 0.2, 0.01);
const pickerRing = (): Geometry => new TorusGeometry(0.5, 0.1, 4, 24);
const helperPoint = (): Geometry => new OctahedronGeometry(0.01, 0);

const HALF_PI = Math.PI / 2;

/**
 * Handles, invisible pickers, and drag helpers of {@link TransformControls}.
 *
 * Mirrors the three.js r186 `TransformControlsGizmo`: handle names, picker
 * shapes, the constant screen-size scale, camera-facing visibility rules,
 * and highlighting match three.js. Visible handles use line shafts and arcs
 * and low-segment cones so the CPU renderer draws the gizmo cheaply.
 */
export class TransformControlsGizmo extends Node {
  override type: string = "TransformControlsGizmo";

  /** Materials recolored by `setColors()`. */
  readonly materialLib: TransformMaterialLib;

  /** Visible handle groups keyed by mode. */
  readonly gizmo: Readonly<Record<TransformMode, Node>>;

  /** Invisible picking groups keyed by mode. */
  readonly picker: Readonly<Record<TransformMode, Node>>;

  /** Drag helper groups keyed by mode. */
  readonly helper: Readonly<Record<TransformMode, Node>>;

  readonly #state: TransformGizmoState;
  readonly #handles = new Map<Node, Handle[]>();

  constructor(state: TransformGizmoState) {
    super();
    this.#state = state;

    const matInvisible = gizmoMaterial("mesh", 0xffffff, 0.15);
    const matHelper = gizmoMaterial("line", 0xffffff, 0.5);
    const matRed = gizmoMaterial("mesh", 0xff0000, 1);
    const matGreen = gizmoMaterial("mesh", 0x00ff00, 1);
    const matBlue = gizmoMaterial("mesh", 0x0000ff, 1);
    const lineRed = gizmoMaterial("line", 0xff0000, 1);
    const lineGreen = gizmoMaterial("line", 0x00ff00, 1);
    const lineBlue = gizmoMaterial("line", 0x0000ff, 1);
    const matRedTransparent = gizmoMaterial("mesh", 0xff0000, 0.5);
    const matGreenTransparent = gizmoMaterial("mesh", 0x00ff00, 0.5);
    const matBlueTransparent = gizmoMaterial("mesh", 0x0000ff, 0.5);
    const matWhiteTransparent = gizmoMaterial("mesh", 0xffffff, 0.25);
    const lineYellowTransparent = gizmoMaterial("line", 0xffff00, 0.25);
    const matYellow = gizmoMaterial("mesh", 0xffff00, 1);
    const lineGray = gizmoMaterial("line", 0x787878, 1);

    this.materialLib = {
      xAxis: matRed,
      yAxis: matGreen,
      zAxis: matBlue,
      active: matYellow,
      xAxisTransparent: matRedTransparent,
      yAxisTransparent: matGreenTransparent,
      zAxisTransparent: matBlueTransparent,
      activeTransparent: lineYellowTransparent,
    };
    // Line twins of the axis materials follow `setColors()` too.
    this.#lineTwins = [
      [matRed, lineRed],
      [matGreen, lineGreen],
      [matBlue, lineBlue],
    ];

    const gizmoTranslate: GizmoDefinition = {
      X: [
        [arrow, matRed, "mesh", [0.5, 0, 0], [0, 0, -HALF_PI]],
        [arrow, matRed, "mesh", [-0.5, 0, 0], [0, 0, HALF_PI]],
        [shaft, lineRed, "line", [0, 0, 0], [0, 0, -HALF_PI]],
      ],
      Y: [
        [arrow, matGreen, "mesh", [0, 0.5, 0]],
        [arrow, matGreen, "mesh", [0, -0.5, 0], [Math.PI, 0, 0]],
        [shaft, lineGreen, "line"],
      ],
      Z: [
        [arrow, matBlue, "mesh", [0, 0, 0.5], [HALF_PI, 0, 0]],
        [arrow, matBlue, "mesh", [0, 0, -0.5], [-HALF_PI, 0, 0]],
        [shaft, lineBlue, "line", undefined, [HALF_PI, 0, 0]],
      ],
      XYZ: [
        [
          () => new OctahedronGeometry(0.1, 0),
          matWhiteTransparent,
          "mesh",
          [0, 0, 0],
        ],
      ],
      XY: [[planeHandle, matBlueTransparent, "mesh", [0.15, 0.15, 0]]],
      YZ: [
        [
          planeHandle,
          matRedTransparent,
          "mesh",
          [0, 0.15, 0.15],
          [0, HALF_PI, 0],
        ],
      ],
      XZ: [
        [
          planeHandle,
          matGreenTransparent,
          "mesh",
          [0.15, 0, 0.15],
          [-HALF_PI, 0, 0],
        ],
      ],
    };

    const pickerTranslate: GizmoDefinition = {
      X: [
        [pickerArrow, matInvisible, "mesh", [0.3, 0, 0], [0, 0, -HALF_PI]],
        [pickerArrow, matInvisible, "mesh", [-0.3, 0, 0], [0, 0, HALF_PI]],
      ],
      Y: [
        [pickerArrow, matInvisible, "mesh", [0, 0.3, 0]],
        [pickerArrow, matInvisible, "mesh", [0, -0.3, 0], [0, 0, Math.PI]],
      ],
      Z: [
        [pickerArrow, matInvisible, "mesh", [0, 0, 0.3], [HALF_PI, 0, 0]],
        [pickerArrow, matInvisible, "mesh", [0, 0, -0.3], [-HALF_PI, 0, 0]],
      ],
      XYZ: [[() => new OctahedronGeometry(0.2, 0), matInvisible, "mesh"]],
      XY: [[pickerPlane, matInvisible, "mesh", [0.15, 0.15, 0]]],
      YZ: [
        [pickerPlane, matInvisible, "mesh", [0, 0.15, 0.15], [0, HALF_PI, 0]],
      ],
      XZ: [
        [pickerPlane, matInvisible, "mesh", [0.15, 0, 0.15], [-HALF_PI, 0, 0]],
      ],
    };

    const helperAxes: GizmoDefinition = {
      X: [
        [
          axisLine,
          matHelper,
          "line",
          [-1e3, 0, 0],
          undefined,
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Y: [
        [
          axisLine,
          matHelper,
          "line",
          [0, -1e3, 0],
          [0, 0, HALF_PI],
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Z: [
        [
          axisLine,
          matHelper,
          "line",
          [0, 0, -1e3],
          [0, -HALF_PI, 0],
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    const helperTranslate: GizmoDefinition = {
      START: [
        [
          helperPoint,
          matHelper,
          "mesh",
          undefined,
          undefined,
          undefined,
          "helper",
        ],
      ],
      END: [
        [
          helperPoint,
          matHelper,
          "mesh",
          undefined,
          undefined,
          undefined,
          "helper",
        ],
      ],
      DELTA: [
        [
          deltaLine,
          matHelper,
          "line",
          undefined,
          undefined,
          undefined,
          "helper",
        ],
      ],
      ...helperAxes,
    };

    const gizmoRotate: GizmoDefinition = {
      XYZE: [[circle(0.5, 1), lineGray, "line", undefined, [0, HALF_PI, 0]]],
      X: [[circle(0.5, 0.5), lineRed, "line"]],
      Y: [[circle(0.5, 0.5), lineGreen, "line", undefined, [0, 0, -HALF_PI]]],
      Z: [[circle(0.5, 0.5), lineBlue, "line", undefined, [0, HALF_PI, 0]]],
      E: [
        [
          circle(0.75, 1),
          lineYellowTransparent,
          "line",
          undefined,
          [0, HALF_PI, 0],
        ],
      ],
    };

    const helperRotate: GizmoDefinition = {
      AXIS: [
        [
          axisLine,
          matHelper,
          "line",
          [-1e3, 0, 0],
          undefined,
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    const pickerRotate: GizmoDefinition = {
      XYZE: [[() => new SphereGeometry(0.25, 10, 8), matInvisible, "mesh"]],
      X: [
        [pickerRing, matInvisible, "mesh", [0, 0, 0], [0, -HALF_PI, -HALF_PI]],
      ],
      Y: [[pickerRing, matInvisible, "mesh", [0, 0, 0], [HALF_PI, 0, 0]]],
      Z: [[pickerRing, matInvisible, "mesh", [0, 0, 0], [0, 0, -HALF_PI]]],
      E: [[() => new TorusGeometry(0.75, 0.1, 2, 24), matInvisible, "mesh"]],
    };

    const gizmoScale: GizmoDefinition = {
      X: [
        [scaleHandle, matRed, "mesh", [0.5, 0, 0], [0, 0, -HALF_PI]],
        [shaft, lineRed, "line", [0, 0, 0], [0, 0, -HALF_PI]],
        [scaleHandle, matRed, "mesh", [-0.5, 0, 0], [0, 0, HALF_PI]],
      ],
      Y: [
        [scaleHandle, matGreen, "mesh", [0, 0.5, 0]],
        [shaft, lineGreen, "line"],
        [scaleHandle, matGreen, "mesh", [0, -0.5, 0], [0, 0, Math.PI]],
      ],
      Z: [
        [scaleHandle, matBlue, "mesh", [0, 0, 0.5], [HALF_PI, 0, 0]],
        [shaft, lineBlue, "line", [0, 0, 0], [HALF_PI, 0, 0]],
        [scaleHandle, matBlue, "mesh", [0, 0, -0.5], [-HALF_PI, 0, 0]],
      ],
      XY: [[planeHandle, matBlueTransparent, "mesh", [0.15, 0.15, 0]]],
      YZ: [
        [
          planeHandle,
          matRedTransparent,
          "mesh",
          [0, 0.15, 0.15],
          [0, HALF_PI, 0],
        ],
      ],
      XZ: [
        [
          planeHandle,
          matGreenTransparent,
          "mesh",
          [0.15, 0, 0.15],
          [-HALF_PI, 0, 0],
        ],
      ],
      XYZ: [
        [() => new BoxGeometry(0.1, 0.1, 0.1), matWhiteTransparent, "mesh"],
      ],
    };

    const pickerScale: GizmoDefinition = {
      ...pickerTranslate,
      XYZ: [
        [() => new BoxGeometry(0.2, 0.2, 0.2), matInvisible, "mesh", [0, 0, 0]],
      ],
    };

    this.gizmo = {
      translate: this.#setup(gizmoTranslate),
      rotate: this.#setup(gizmoRotate),
      scale: this.#setup(gizmoScale),
    };
    this.picker = {
      translate: this.#setup(pickerTranslate),
      rotate: this.#setup(pickerRotate),
      scale: this.#setup(pickerScale),
    };
    this.helper = {
      translate: this.#setup(helperTranslate),
      rotate: this.#setup(helperRotate),
      scale: this.#setup(helperAxes),
    };
    this.add(this.gizmo.translate, this.gizmo.rotate, this.gizmo.scale);
    this.add(this.picker.translate, this.picker.rotate, this.picker.scale);
    this.add(this.helper.translate, this.helper.rotate, this.helper.scale);

    // Pickers are never drawn.
    this.picker.translate.visible = false;
    this.picker.rotate.visible = false;
    this.picker.scale.visible = false;
  }

  readonly #lineTwins: ReadonlyArray<readonly [GizmoMaterial, GizmoMaterial]>;

  /** Recolors the axis and active materials, as three.js `setColors()` does. */
  setColors(
    xAxis: number | string,
    yAxis: number | string,
    zAxis: number | string,
    active: number | string,
  ): void {
    const lib = this.materialLib;
    lib.xAxis.color.set(xAxis);
    lib.yAxis.color.set(yAxis);
    lib.zAxis.color.set(zAxis);
    lib.active.color.set(active);
    lib.xAxisTransparent.color.set(xAxis);
    lib.yAxisTransparent.color.set(yAxis);
    lib.zAxisTransparent.color.set(zAxis);
    lib.activeTransparent.color.set(active);
    for (const [source, twin] of this.#lineTwins) twin.color.copy(source.color);
    for (const entry of Object.values(lib) as GizmoMaterial[])
      entry.material.color.copy(entry.color);
    for (const [, twin] of this.#lineTwins)
      twin.material.color.copy(twin.color);
  }

  /**
   * Returns the nearest picker hit for `mode`, skipping hidden handles
   * unless `includeInvisible` is set. The picker group itself is hidden, so
   * each handle is raycast directly instead of through scene traversal.
   */
  intersectPicker(
    mode: TransformMode,
    raycaster: Raycaster,
  ): Intersection | undefined {
    _hits.length = 0;
    for (const child of this.picker[mode].children)
      (child as Mesh).raycast(raycaster, _hits);
    _hits.sort((a, b) => a.distance - b.distance);
    let result: Intersection | undefined;
    for (const hit of _hits) {
      if ((hit.object as Node).visible) {
        result = hit;
        break;
      }
    }
    _hits.length = 0;
    return result;
  }

  /** Disposes every handle geometry and material. */
  dispose(): void {
    const materials = new Set<BasicMaterial | LineMaterial>();
    for (const handles of this.#handles.values()) {
      for (const handle of handles) {
        handle.node.geometry?.dispose();
        materials.add(handle.material.material);
      }
    }
    for (const material of materials) material.dispose();
  }

  /** Updates handle placement, scale, visibility, and highlight, then world matrices. */
  override updateMatrixWorld(
    updateParents: boolean = false,
    updateChildren: boolean = true,
    force: boolean = false,
  ): void {
    const state = this.#state;
    const mode = state.mode;
    // Scale handles are always oriented to the local rotation.
    const space = mode === "scale" ? "local" : state.space;
    const quaternion =
      space === "local" ? state.worldQuaternion : _identityQuaternion;

    this.gizmo.translate.visible = mode === "translate";
    this.gizmo.rotate.visible = mode === "rotate";
    this.gizmo.scale.visible = mode === "scale";
    this.helper.translate.visible = mode === "translate";
    this.helper.rotate.visible = mode === "rotate";
    this.helper.scale.visible = mode === "scale";

    const camera = state.camera;
    let factor: number;
    if (camera instanceof OrthographicCamera) {
      factor = (camera.top - camera.bottom) / camera.zoom;
    } else {
      factor =
        state.worldPosition.distanceTo(state.cameraPosition) *
        Math.min(
          (1.9 * Math.tan((Math.PI * camera.fov) / 360)) / camera.zoom,
          7,
        );
    }
    const handleScale = (factor * state.size) / 4;

    for (const group of [
      this.picker[mode],
      this.gizmo[mode],
      this.helper[mode],
    ]) {
      const handles = this.#handles.get(group);
      if (handles === undefined) continue;
      for (const handle of handles)
        this.#updateHandle(handle, quaternion, handleScale);
    }

    super.updateMatrixWorld(updateParents, updateChildren, force);
  }

  #updateHandle(handle: Handle, quaternion: Quaternion, scale: number): void {
    const state = this.#state;
    const node = handle.node;
    const name = handle.name;
    node.visible = true;
    node.rotation.set(0, 0, 0);
    node.position.copy(state.worldPosition);
    node.scale.set(scale, scale, scale);

    if (handle.tag === "helper") {
      this.#updateHelper(handle, quaternion);
      return;
    }

    node.quaternion.copy(quaternion);
    const eye = state.eye;
    if (state.mode === "translate" || state.mode === "scale") {
      let hidden = false;
      if (name === "X")
        hidden = alignment(_unitX, quaternion, eye) > AXIS_HIDE_THRESHOLD;
      else if (name === "Y")
        hidden = alignment(_unitY, quaternion, eye) > AXIS_HIDE_THRESHOLD;
      else if (name === "Z")
        hidden = alignment(_unitZ, quaternion, eye) > AXIS_HIDE_THRESHOLD;
      else if (name === "XY")
        hidden = alignment(_unitZ, quaternion, eye) < PLANE_HIDE_THRESHOLD;
      else if (name === "YZ")
        hidden = alignment(_unitX, quaternion, eye) < PLANE_HIDE_THRESHOLD;
      else if (name === "XZ")
        hidden = alignment(_unitY, quaternion, eye) < PLANE_HIDE_THRESHOLD;
      if (hidden) {
        node.scale.set(1e-10, 1e-10, 1e-10);
        node.visible = false;
      }
    } else if (state.mode === "rotate") {
      _tempQuaternion2.copy(quaternion);
      _alignVector
        .copy(eye)
        .applyQuaternion(_tempQuaternion.copy(quaternion).invert());
      if (name.includes("E")) {
        node.quaternion.setFromRotationMatrix(
          _lookAtMatrix.lookAt(eye, _zeroVector, _unitY),
        );
      }
      if (name === "X") {
        _tempQuaternion.setFromAxisAngle(
          _unitX,
          Math.atan2(-_alignVector.y, _alignVector.z),
        );
        node.quaternion.multiplyQuaternions(_tempQuaternion2, _tempQuaternion);
      } else if (name === "Y") {
        _tempQuaternion.setFromAxisAngle(
          _unitY,
          Math.atan2(_alignVector.x, _alignVector.z),
        );
        node.quaternion.multiplyQuaternions(_tempQuaternion2, _tempQuaternion);
      } else if (name === "Z") {
        _tempQuaternion.setFromAxisAngle(
          _unitZ,
          Math.atan2(_alignVector.y, _alignVector.x),
        );
        node.quaternion.multiplyQuaternions(_tempQuaternion2, _tempQuaternion);
      }
    }

    node.visible = node.visible && isShown(name, state);

    const entry = handle.material;
    const material = entry.material;
    material.color.copy(entry.color);
    material.opacity = translucency(entry.opacity);
    const axis = state.axis;
    if (state.enabled && axis !== undefined) {
      if (name === axis || (name.length === 1 && axis.includes(name))) {
        material.color.copy(this.materialLib.active.color);
        material.opacity = 0;
      }
    }
  }

  #updateHelper(handle: Handle, quaternion: Quaternion): void {
    const state = this.#state;
    const node = handle.node;
    const eye = state.eye;
    const axis = state.axis;
    node.visible = false;
    switch (handle.name) {
      case "AXIS":
        node.visible = axis !== undefined;
        if (axis === "X") {
          _tempQuaternion.setFromEuler(_tempEuler.set(0, 0, 0));
          node.quaternion.copy(quaternion).multiply(_tempQuaternion);
          if (alignment(_unitX, quaternion, eye) > 0.9) node.visible = false;
        }
        if (axis === "Y") {
          _tempQuaternion.setFromEuler(_tempEuler.set(0, 0, HALF_PI));
          node.quaternion.copy(quaternion).multiply(_tempQuaternion);
          if (alignment(_unitY, quaternion, eye) > 0.9) node.visible = false;
        }
        if (axis === "Z") {
          _tempQuaternion.setFromEuler(_tempEuler.set(0, HALF_PI, 0));
          node.quaternion.copy(quaternion).multiply(_tempQuaternion);
          if (alignment(_unitZ, quaternion, eye) > 0.9) node.visible = false;
        }
        if (axis === "XYZE") {
          _tempQuaternion.setFromEuler(_tempEuler.set(0, HALF_PI, 0));
          _alignVector.copy(state.rotationAxis);
          node.quaternion.setFromRotationMatrix(
            _lookAtMatrix.lookAt(_zeroVector, _alignVector, _unitY),
          );
          node.quaternion.multiply(_tempQuaternion);
          node.visible = state.dragging;
        }
        if (axis === "E") node.visible = false;
        break;
      case "START":
        node.position.copy(state.worldPositionStart);
        node.visible = state.dragging;
        break;
      case "END":
        node.position.copy(state.worldPosition);
        node.visible = state.dragging;
        break;
      case "DELTA":
        node.position.copy(state.worldPositionStart);
        node.quaternion.copy(state.worldQuaternionStart);
        _tempVector
          .set(1e-10, 1e-10, 1e-10)
          .add(state.worldPositionStart)
          .sub(state.worldPosition)
          .multiplyScalar(-1);
        _tempVector.applyQuaternion(
          _tempQuaternion.copy(state.worldQuaternionStart).invert(),
        );
        node.scale.copy(_tempVector);
        node.visible = state.dragging;
        break;
      default:
        node.quaternion.copy(quaternion);
        node.position.copy(
          state.dragging ? state.worldPositionStart : state.worldPosition,
        );
        if (axis !== undefined) node.visible = axis.includes(handle.name);
    }
  }

  /** Builds one handle group, baking each entry's transform into its geometry. */
  #setup(definition: GizmoDefinition): Node {
    const group = new Node();
    const handles: Handle[] = [];
    for (const name of Object.keys(definition)) {
      const entries = definition[name] ?? [];
      for (let index = entries.length - 1; index >= 0; index--) {
        const [create, material, kind, position, rotation, scale, tag] =
          entries[index];
        const geometry = create();
        _bakePosition.set(0, 0, 0);
        _bakeScale.set(1, 1, 1);
        _tempEuler.set(0, 0, 0);
        if (position) _bakePosition.set(position[0], position[1], position[2]);
        if (rotation) _tempEuler.set(rotation[0], rotation[1], rotation[2]);
        if (scale) _bakeScale.set(scale[0], scale[1], scale[2]);
        _bakeQuaternion.setFromEuler(_tempEuler);
        geometry.applyMatrix4(
          _bakeMatrix.compose(_bakePosition, _bakeQuaternion, _bakeScale),
        );
        const node =
          kind === "mesh"
            ? new Mesh(geometry, material.material)
            : new Line(geometry, material.material as LineMaterial);
        node.name = name;
        node.frustumCulled = false;
        group.add(node);
        handles.push({ node, name, tag, material });
      }
    }
    this.#handles.set(group, handles);
    return group;
  }
}

/** Absolute dot product of `unit` rotated by `quaternion` with `eye`. */
function alignment(
  unit: Vector3,
  quaternion: Quaternion,
  eye: Vector3,
): number {
  return Math.abs(_alignVector.copy(unit).applyQuaternion(quaternion).dot(eye));
}

/** Applies the `show*` flags to a handle name, as three.js does. */
function isShown(name: string, state: TransformGizmoState): boolean {
  if (name.includes("X") && !state.showX) return false;
  if (name.includes("Y") && !state.showY) return false;
  if (name.includes("Z") && !state.showZ) return false;
  if (name.includes("E") && !(state.showX && state.showY && state.showZ))
    return false;
  if (name.includes("XY") && !state.showXY) return false;
  if (name.includes("YZ") && !state.showYZ) return false;
  if (name.includes("XZ") && !state.showXZ) return false;
  if (name === "E" && !state.showE) return false;
  if (name === "XYZE" && !state.showXYZE) return false;
  return true;
}
