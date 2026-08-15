import { OrthographicCamera } from "../../cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "../../cameras/PerspectiveCamera.ts";
import { finite, record } from "./validation.ts";

type CameraSource = Readonly<
  Record<string, unknown> & {
    type?: unknown;
    orthographic?: unknown;
    perspective?: unknown;
  }
>;

type OrthographicSource = Readonly<
  Record<string, unknown> & {
    xmag?: unknown;
    ymag?: unknown;
    znear?: unknown;
    zfar?: unknown;
  }
>;

type PerspectiveSource = Readonly<
  Record<string, unknown> & {
    yfov?: unknown;
    aspectRatio?: unknown;
    znear?: unknown;
    zfar?: unknown;
  }
>;

/** Creates an orthographic or perspective camera from a glTF camera record. */
export function parseCamera(
  source: CameraSource,
  index: number,
): PerspectiveCamera | OrthographicCamera {
  const type = source.type;
  if (type === "orthographic") {
    const orthographic = record(
      source.orthographic,
      `cameras[${index}].orthographic`,
    ) as OrthographicSource;
    const xmag = finite(orthographic.xmag, "camera.xmag");
    const ymag = finite(orthographic.ymag, "camera.ymag");
    return new OrthographicCamera({
      left: -xmag,
      right: xmag,
      top: ymag,
      bottom: -ymag,
      near: finite(orthographic.znear, "camera.znear"),
      far: finite(orthographic.zfar, "camera.zfar"),
    });
  }
  if (type !== "perspective")
    throw new Error(`GLTFLoader: unsupported camera type at index ${index}.`);
  const perspective = record(
    source.perspective,
    `cameras[${index}].perspective`,
  ) as PerspectiveSource;
  return new PerspectiveCamera({
    fov: (finite(perspective.yfov, "camera.yfov") * 180) / Math.PI,
    aspect: finite(perspective.aspectRatio, "camera.aspectRatio", 1),
    near: finite(perspective.znear, "camera.znear"),
    far: finite(perspective.zfar, "camera.zfar", 2000),
  });
}
