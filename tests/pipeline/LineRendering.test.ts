import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.js";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.js";
import { Scene } from "@/core/Scene.js";
import { Geometry } from "@/geometry/Geometry.js";
import { AxesHelper } from "@/helpers/AxesHelper.js";
import { BasicMaterial } from "@/materials/BasicMaterial.js";
import { DashedLineMaterial } from "@/materials/DashedLineMaterial.js";
import { LineMaterial } from "@/materials/LineMaterial.js";
import { Line } from "@/objects/Line.js";
import { LineLoop } from "@/objects/LineLoop.js";
import { LineSegments } from "@/objects/LineSegments.js";
import { SceneTraversal } from "@/pipeline/SceneTraversal.js";
import { Renderer } from "@/renderers/Renderer.js";

function makeCamera(): OrthographicCamera {
  return new OrthographicCamera({
    left: -1,
    right: 1,
    top: 1,
    bottom: -1,
    near: 0.1,
    far: 10,
  });
}

function makeLineGeometry(): Geometry {
  return new Geometry().setPositions([
    -0.8, 0, -1, 0, 0.8, -1, 0.8, 0.8, -1, -0.8, 0.8, -1,
  ]);
}

describe("SceneTraversal line primitives", () => {
  it("builds a reusable line draw call without a triangle buffer", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const line = new Line(
      makeLineGeometry(),
      new LineMaterial({ color: 0xff0000 }),
    );
    scene.add(line);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);

    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    expect(drawList.length).toBe(1);
    const drawCall = drawList.calls[0];
    expect(drawCall?.primitive).toBe("lines");
    expect(drawCall?.triangles).toBeUndefined();
    expect(drawCall?.projectedVerts.length).toBe(0);
    expect(drawCall?.lines?.length).toBe(3);
    const lines = drawCall?.lines;
    expect(
      Array.from(lines?.continuesPrevious.slice(0, lines.length) ?? []),
    ).toEqual([0, 1, 1]);
    expect(
      Array.from(drawCall?.lines?.screenX.slice(0, 6) ?? []).every((value) =>
        Number.isInteger(value),
      ),
    ).toBe(true);
  });

  it("reuses line storage across repeated traversals", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const line = new Line(
      makeLineGeometry(),
      new LineMaterial({ color: 0xff0000 }),
    );
    scene.add(line);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);

    const traversal = new SceneTraversal();
    const first = traversal.traverse(scene as never, camera as never, 16, 16);
    const firstCall = first.calls[0];
    const firstBuffer = firstCall?.lines;
    const firstScreenX = firstBuffer?.screenX;
    const second = traversal.traverse(scene as never, camera as never, 16, 16);

    expect(second.calls[0]).toBe(firstCall);
    expect(second.calls[0]?.lines).toBe(firstBuffer);
    expect(second.calls[0]?.lines?.screenX).toBe(firstScreenX);
  });

  it("does not compute missing bounds implicitly", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const geometry = makeLineGeometry();
    let computeCalls = 0;
    geometry.computeBoundingSphere = () => {
      computeCalls++;
      throw new Error("bounds must be prepared explicitly");
    };
    scene.add(new Line(geometry, new LineMaterial()));
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    expect(computeCalls).toBe(0);
    expect(drawList.length).toBe(1);
  });

  it("uses indexed pairs and discards an odd LineSegments index", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const geometry = makeLineGeometry();
    geometry.index = [0, 1, 2, 3, 1];
    const line = new LineSegments(geometry, new LineMaterial());
    scene.add(line);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    expect(drawList.calls[0]?.lines?.length).toBe(2);
    const lines = drawList.calls[0]?.lines;
    expect(
      Array.from(lines?.continuesPrevious.slice(0, lines.length) ?? []),
    ).toEqual([0, 0]);
  });

  it("uses line class identity instead of mutable type labels", () => {
    class RenamedSegments extends LineSegments {
      override type = "Line";
    }
    class RenamedLine extends Line {
      override type = "LineSegments";
    }
    const scene = new Scene();
    const camera = makeCamera();
    const geometry = makeLineGeometry();
    scene.add(new RenamedSegments(geometry, new LineMaterial()));
    scene.add(new RenamedLine(geometry, new LineMaterial()));
    expect(
      () =>
        new LineSegments(
          geometry,
          new BasicMaterial() as unknown as LineMaterial,
        ),
    ).toThrow(TypeError);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    expect(drawList.length).toBe(2);
    expect(drawList.calls[0]?.lines?.length).toBe(2);
    expect(drawList.calls[1]?.lines?.length).toBe(3);
  });

  it("adds the closing LineLoop segment", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const line = new LineLoop(makeLineGeometry(), new LineMaterial());
    scene.add(line);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    expect(drawList.calls[0]?.lines?.length).toBe(4);
    const lines = drawList.calls[0]?.lines;
    expect(
      Array.from(lines?.continuesPrevious.slice(0, lines.length) ?? []),
    ).toEqual([0, 1, 1, 1]);
  });

  it("clips a perspective segment crossing the near plane", () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera({
      fov: 60,
      aspect: 1,
      near: 0.1,
      far: 10,
    });
    const geometry = new Geometry().setPositions([-0.2, 0, -0.01, 0.2, 0, -1]);
    const line = new LineSegments(
      geometry,
      new DashedLineMaterial({ dashSize: 2, gapSize: 2 }),
    );
    scene.add(line);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      32,
      32,
    );
    const buffer = drawList.calls[0]?.lines;
    expect(buffer?.length).toBe(1);
    expect(buffer?.screenX[0]).toBeGreaterThanOrEqual(0);
    expect(buffer?.screenX[1]).toBeLessThan(32);
    expect(buffer?.dashPhase[0]).toBeGreaterThan(0);
  });

  it("rejects line segments outside every clip plane without bounds", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const positions = [
      [-3, 0, -1, -2, 0, -1],
      [2, 0, -1, 3, 0, -1],
      [0, -3, -1, 0, -2, -1],
      [0, 2, -1, 0, 3, -1],
      [0, 0, -0.01, 0.2, 0, -0.01],
      [0, 0, -20, 0.2, 0, -20],
    ];
    for (const position of positions) {
      scene.add(
        new LineSegments(
          new Geometry().setPositions(position),
          new LineMaterial(),
        ),
      );
    }
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    expect(drawList.length).toBe(6);
    for (const drawCall of drawList.calls) {
      expect(drawCall.lines?.length).toBe(0);
    }
  });

  it("preserves dash phase when viewport clipping trims a segment", () => {
    const scene = new Scene();
    const camera = makeCamera();
    const line = new LineSegments(
      new Geometry().setPositions([-2, 0, -1, 1, 0, -1]),
      new DashedLineMaterial({ dashSize: 2, gapSize: 2 }),
    );
    scene.add(line);
    scene.updateMatrixWorld(true, true);
    camera.updateViewMatrix(true, false);
    const drawList = new SceneTraversal().traverse(
      scene as never,
      camera as never,
      16,
      16,
    );
    const buffer = drawList.calls[0]?.lines;
    expect(buffer?.length).toBe(1);
    expect(buffer?.dashPhase[0]).toBeGreaterThan(0);
    expect(Number.isInteger(buffer?.dashPhase[0])).toBe(true);
  });
});

describe("Renderer line integration", () => {
  it("uploads visible line pixels through the CPU framebuffer", () => {
    let imageData:
      | { data: Uint8ClampedArray; width: number; height: number }
      | undefined;
    const canvas = {
      width: 32,
      height: 32,
      getContext: () => ({
        imageSmoothingEnabled: false,
        putImageData: (value: unknown) => {
          imageData = value as typeof imageData;
        },
      }),
    } as unknown as HTMLCanvasElement;
    const renderer = new Renderer({ canvas, width: 32, height: 32 });
    const scene = new Scene();
    const camera = makeCamera();
    scene.add(
      new LineSegments(
        new Geometry().setPositions([-0.8, 0, -1, 0.8, 0, -1]),
        new LineMaterial({ color: 0xff0000 }),
      ),
    );
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    let nonBlack = 0;
    for (let i = 0; i < (imageData?.data.length ?? 0); i += 4) {
      if (
        imageData?.data[i] ||
        imageData?.data[i + 1] ||
        imageData?.data[i + 2]
      ) {
        nonBlack++;
      }
    }
    expect(nonBlack).toBeGreaterThan(0);
  });

  it("renders the same primitive through a perspective camera", () => {
    let imageData:
      | { data: Uint8ClampedArray; width: number; height: number }
      | undefined;
    const canvas = {
      width: 32,
      height: 32,
      getContext: () => ({
        imageSmoothingEnabled: false,
        putImageData: (value: unknown) => {
          imageData = value as typeof imageData;
        },
      }),
    } as unknown as HTMLCanvasElement;
    const renderer = new Renderer({ canvas, width: 32, height: 32 });
    const scene = new Scene();
    const camera = new PerspectiveCamera({
      fov: 60,
      aspect: 1,
      near: 0.1,
      far: 10,
    });
    scene.add(
      new LineSegments(
        new Geometry().setPositions([-0.5, 0, -1, 0.5, 0, -1]),
        new LineMaterial({ color: 0x00ff00 }),
      ),
    );
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    let nonBlack = 0;
    for (let i = 0; i < (imageData?.data.length ?? 0); i += 4) {
      if (
        imageData?.data[i] ||
        imageData?.data[i + 1] ||
        imageData?.data[i + 2]
      ) {
        nonBlack++;
      }
    }
    expect(nonBlack).toBeGreaterThan(0);
  });

  it("renders an AxesHelper's colored LineSegments", () => {
    let imageData:
      | { data: Uint8ClampedArray; width: number; height: number }
      | undefined;
    const canvas = {
      width: 32,
      height: 32,
      getContext: () => ({
        imageSmoothingEnabled: false,
        putImageData: (value: unknown) => {
          imageData = value as typeof imageData;
        },
      }),
    } as unknown as HTMLCanvasElement;
    const renderer = new Renderer({ canvas, width: 32, height: 32 });
    const scene = new Scene();
    const camera = makeCamera();
    const axes = new AxesHelper(0.75);
    axes.position.z = -1;
    scene.add(axes);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
    let nonBlack = 0;
    for (let i = 0; i < (imageData?.data.length ?? 0); i += 4) {
      if (
        imageData?.data[i] ||
        imageData?.data[i + 1] ||
        imageData?.data[i + 2]
      ) {
        nonBlack++;
      }
    }
    expect(nonBlack).toBeGreaterThan(0);
  });
});
