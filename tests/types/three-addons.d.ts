declare module "three/addons/curves/NURBSCurve.js" {
  import type { Vector3, Vector4 } from "three";

  export class NURBSCurve {
    constructor(
      degree: number,
      knots: number[],
      controlPoints: Vector4[],
      startKnot?: number,
      endKnot?: number,
    );
    getPoint(t: number, target?: Vector3): Vector3;
    getTangent(t: number, target?: Vector3): Vector3;
  }
}

declare module "three/addons/curves/NURBSSurface.js" {
  import type { Vector2, Vector3, Vector4 } from "three";

  export class NURBSSurface {
    constructor(
      degree1: number,
      degree2: number,
      knots1: number[],
      knots2: number[],
      controlPoints: Array<Array<Vector2 | Vector3 | Vector4>>,
    );
    getPoint(t1: number, t2: number, target: Vector3): void;
  }
}

declare module "three/addons/loaders/SVGLoader.js" {
  import type { Vector2 } from "three";

  export class SVGLoader {
    parse(text: string): {
      paths: Array<{
        subPaths: Array<{
          curves: Array<{ type: string; getPoint(t: number): Vector2 }>;
        }>;
      }>;
    };
  }
}

declare module "three/addons/controls/TrackballControls.js" {
  import type { Vector3 } from "three";

  export class TrackballControls {
    constructor(object: unknown, domElement?: EventTarget);
    target: Vector3;
    enabled: boolean;
    state: number;
    keyState: number;
    screen: { left: number; top: number; width: number; height: number };
    rotateSpeed: number;
    zoomSpeed: number;
    panSpeed: number;
    rollSpeed: number;
    noRotate: boolean;
    noZoom: boolean;
    noPan: boolean;
    multiTouchRoll: boolean;
    staticMoving: boolean;
    dynamicDampingFactor: number;
    minDistance: number;
    maxDistance: number;
    minZoom: number;
    maxZoom: number;
    keys: string[];
    mouseButtons: {
      LEFT: 0 | 1 | 2 | undefined;
      MIDDLE: 0 | 1 | 2 | undefined;
      RIGHT: 0 | 1 | 2 | undefined;
    };
    addEventListener(
      type: string,
      listener: (event: { type: string }) => void,
    ): void;
    update(): void;
    reset(): void;
    handleResize(): void;
    dispose(): void;
  }
}
