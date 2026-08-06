import {
  AmbientLight,
  BasicMaterial,
  DataTexture,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Renderer,
  Scene,
  Side,
  Timer,
  Vector3,
  VideoTexture,
} from "@/index.js";

const VIDEO_READY_STATE = 2;

export function createFallbackTexture(width = 64, height = 36, seed = 0) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const offset = (row * width + column) * 4;
      const wave = Math.sin((column + seed) * 0.32) * 18;
      const stripe = Math.sin((row + seed) * 0.55) * 14;
      data[offset] = Math.max(0, Math.min(255, 22 + wave + stripe));
      data[offset + 1] = Math.max(0, Math.min(255, 58 + wave));
      data[offset + 2] = Math.max(0, Math.min(255, 112 + stripe));
      data[offset + 3] = 255;
    }
  }
  return new DataTexture(data, width, height);
}

export function createMediaScene(
  canvas,
  geometry,
  {
    background = 0x101722,
    cameraPosition = [0, 0.15, 5.8],
    target = [0, 0, 0],
    fov = 48,
    side = Side.Double,
    seed = 0,
  } = {},
) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = background;
  const camera = new PerspectiveCamera({
    fov,
    aspect: width / height,
    near: 0.1,
    far: 100,
  });
  camera.position.set(...cameraPosition);
  camera.lookAt(new Vector3(...target));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.7));
  const key = new DirectionalLight(0xffffff, 0.35);
  key.position.set(2, 3, 4);
  scene.add(key);
  const fallbackTexture = createFallbackTexture(64, 36, seed);
  const material = new BasicMaterial({ map: fallbackTexture, side });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  return {
    width,
    height,
    scene,
    camera,
    renderer,
    geometry,
    material,
    mesh,
    fallbackTexture,
    video: null,
    videoTexture: null,
    videoFrameTexture: null,
    disposed: /** @type {boolean} */ (false),
  };
}

export function createVideoElement(source) {
  if (typeof globalThis.document === "undefined") return;
  const video = globalThis.document.createElement("video");
  video.autoplay = true;
  video.controls = false;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  if (source !== undefined) video.src = source;
  return video;
}

export function connectVideoTexture(state, source, { onReady, onError } = {}) {
  const video = createVideoElement(source);
  if (!video) {
    onError?.(new Error("HTMLVideoElement is unavailable."));
    return;
  }
  state.video = video;
  const texture = new VideoTexture(video);
  texture.flipY = false;
  state.videoTexture = texture;
  const loaded = () => {
    if (state.disposed) return;
    texture.needsUpdate = true;
    texture.update();
    if (texture.data) {
      state.material.map = texture;
      state.fallbackTexture.dispose();
      onReady?.(video, texture);
    } else {
      onError?.(new Error("Canvas2D cannot read the decoded video frame."));
    }
  };
  const failed = () => {
    if (!state.disposed)
      onError?.(new Error("Video source could not be decoded."));
  };
  video.addEventListener("loadeddata", loaded);
  video.addEventListener("canplay", loaded);
  video.addEventListener("error", failed);
  try {
    reportPlayResult(video.play?.(), failed);
  } catch (error) {
    failed(error);
  }
  return () => {
    video.removeEventListener("loadeddata", loaded);
    video.removeEventListener("canplay", loaded);
    video.removeEventListener("error", failed);
    video.pause?.();
    const stream = video.srcObject;
    if (stream && typeof stream.getTracks === "function") {
      for (const track of stream.getTracks()) track.stop?.();
    }
    video.srcObject = null;
    video.removeAttribute("src");
    try {
      video.load?.();
    } catch (error) {
      void error;
    }
    texture.dispose();
  };
}

export function refreshVideoTexture(state) {
  if (
    state.videoTexture &&
    state.material.map === state.videoTexture &&
    state.video?.readyState >=
      (state.video.HAVE_CURRENT_DATA || VIDEO_READY_STATE)
  ) {
    state.videoTexture.update();
  }
}

export function startMediaLoop(state, update) {
  const timer = new Timer();
  const requestFrame =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : undefined;
  const cancelFrame =
    typeof globalThis.cancelAnimationFrame === "function"
      ? globalThis.cancelAnimationFrame.bind(globalThis)
      : undefined;
  let animationFrame;
  const animate = (timestamp) => {
    if (state.disposed) return;
    const frame = timer.update(timestamp);
    update?.(frame);
    refreshVideoTexture(state);
    state.renderer.prepare(state.scene, state.camera);
    state.renderer.render(state.scene, state.camera);
    if (requestFrame) animationFrame = requestFrame(animate);
  };
  animate();
  return () => {
    if (animationFrame !== undefined) cancelFrame?.(animationFrame);
  };
}

export function addMediaStatus(canvas, initialText) {
  const parent = canvas.parentElement;
  if (!parent || typeof globalThis.document === "undefined") {
    return { set: () => undefined, cleanup: () => undefined };
  }
  const status = globalThis.document.createElement("output");
  status.dataset.mediaStatus = "true";
  status.setAttribute("aria-live", "polite");
  status.style.display = "block";
  status.style.font = "12px/1.4 system-ui, sans-serif";
  status.style.color = "#9fb6cc";
  status.textContent = initialText;
  parent.append(status);
  return {
    set(value) {
      status.textContent = value;
    },
    cleanup() {
      status.remove();
    },
  };
}

export function requestWebcam(video, onReady, onError) {
  const getUserMedia = globalThis.navigator?.mediaDevices?.getUserMedia;
  if (typeof getUserMedia !== "function") {
    onError?.(new Error("navigator.mediaDevices.getUserMedia is unavailable."));
    return () => undefined;
  }
  let active = true;
  let request;
  try {
    request = getUserMedia.call(globalThis.navigator.mediaDevices, {
      audio: false,
      video: { facingMode: "user" },
    });
  } catch (error) {
    onError?.(error);
    return () => undefined;
  }
  Promise.resolve(request)
    .then((stream) => {
      if (!active) {
        for (const track of stream.getTracks?.() ?? []) track.stop?.();
        return;
      }
      video.srcObject = stream;
      reportPlayResult(video.play?.(), onError);
      onReady?.(stream);
    })
    .catch(onError);
  return () => {
    active = false;
    const stream = video.srcObject;
    for (const track of stream?.getTracks?.() ?? []) track.stop?.();
    video.srcObject = null;
  };
}

export async function captureVideoFrame(video) {
  const VideoFrameConstructor = Reflect.get(globalThis, "VideoFrame");
  if (typeof VideoFrameConstructor !== "function") return;
  if (video.readyState < (video.HAVE_CURRENT_DATA || VIDEO_READY_STATE)) {
    return;
  }
  let frame;
  try {
    frame = new VideoFrameConstructor(video);
    if (typeof frame.copyTo !== "function") return;
    const width = frame.codedWidth || frame.displayWidth || 1;
    const height = frame.codedHeight || frame.displayHeight || 1;
    const bytes = new Uint8Array(width * height * 4);
    await frame.copyTo(bytes, {
      format: "RGBA",
      layout: [{ offset: 0, stride: width * 4 }],
    });
    const texture = new DataTexture(
      new Uint8ClampedArray(bytes),
      width,
      height,
    );
    return texture;
  } catch (error) {
    void error;
  } finally {
    frame?.close?.();
  }
}

function reportPlayResult(result, onError) {
  if (result && typeof result.catch === "function") {
    void result.catch(onError);
  }
}

export function disposeMediaState(state, stopVideo, stopLoop, status) {
  state.disposed = true;
  stopLoop?.();
  stopVideo?.();
  status?.cleanup();
  state.videoFrameTexture?.dispose();
  state.videoTexture?.dispose();
  state.fallbackTexture.dispose();
  state.material.dispose();
  state.geometry.dispose();
  state.renderer.dispose();
}
