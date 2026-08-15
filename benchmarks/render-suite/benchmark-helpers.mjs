export function createBenchmarkCanvas(width, height, sink) {
  return {
    width,
    height,
    getContext(type) {
      if (type !== "2d") return null;
      return {
        imageSmoothingEnabled: false,
        putImageData(imageData) {
          const data = imageData.data;
          sink.value = (sink.value + data[0] + data.at(-4)) | 0;
        },
      };
    },
  };
}

export function createBenchmarkEventTarget(width, height) {
  const listeners = new Map();
  return {
    style: {},
    clientWidth: width,
    clientHeight: height,
    addEventListener(type, listener) {
      let entries = listeners.get(type);
      if (!entries) {
        entries = [];
        listeners.set(type, entries);
      }
      entries.push(listener);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type);
      if (!entries) return;
      const index = entries.indexOf(listener);
      if (index !== -1) entries.splice(index, 1);
    },
    setPointerCapture() {
      /* Pointer capture is not needed by this deterministic target. */
    },
    releasePointerCapture() {
      /* Pointer capture is not needed by this deterministic target. */
    },
    dispatch(type, event) {
      const entries = listeners.get(type) ?? [];
      for (const listener of entries) listener(event);
    },
  };
}

export function createGeometryJson(vertexCount) {
  const positions = new Array(vertexCount * 3);
  const normals = new Array(vertexCount * 3);
  const uvs = new Array(vertexCount * 2);
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = Math.sin(i * 0.11);
    positions[i * 3 + 1] = Math.cos(i * 0.07);
    positions[i * 3 + 2] = (i % 17) * 0.03;
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0;
    uvs[i * 2] = (i % 32) / 31;
    uvs[i * 2 + 1] = ((i / 32) | 0) / 31;
  }
  const index = [];
  for (let i = 0; i < vertexCount - 2; i += 3) {
    index.push(i, i + 1, i + 2);
  }
  return {
    attributes: {
      position: { array: positions, itemSize: 3 },
      normal: { array: normals, itemSize: 3 },
      uv: { array: uvs, itemSize: 2 },
    },
    index: { array: index },
  };
}

export function createObjectJson(depth, width) {
  function build(level, index) {
    const node = {
      type: "Group",
      name: `loader-node-${level}-${index}`,
      visible: true,
      position: [level * 0.1, index * 0.05, 0],
      scale: [1, 1, 1],
      children: [],
    };
    if (level < depth) {
      for (let i = 0; i < width; i++) node.children.push(build(level + 1, i));
    }
    return node;
  }
  return build(0, 0);
}

export function createAnimationJson(trackCount, keyCount) {
  const times = [];
  for (let i = 0; i < keyCount; i++) times.push((i / (keyCount - 1)) * 2);
  const tracks = [];
  for (let i = 0; i < trackCount; i++) {
    const values = [];
    for (let k = 0; k < keyCount; k++) values.push(Math.sin(i * 0.3 + k * 0.2));
    tracks.push({
      type: "number",
      name: `loader-node-${i & 7}.position.x`,
      times,
      values,
    });
  }
  return [{ name: "loader-clip", duration: 2, tracks }];
}

export function installBenchmarkOffscreenCanvas() {
  if (typeof globalThis.OffscreenCanvas !== "undefined") return;
  globalThis.OffscreenCanvas = class BenchmarkOffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.source = undefined;
    }
    getContext(type) {
      if (type !== "2d") return;
      return {
        imageSmoothingEnabled: false,
        drawImage: (source) => {
          this.source = source;
        },
        getImageData: (_x, _y, width, height) => {
          const data = new Uint8ClampedArray(width * height * 4);
          const phase = this.source?.phase ?? 0;
          for (let i = 0; i < data.length; i += 4) {
            const pixel = (i >> 2) + phase;
            data[i] = pixel & 255;
            data[i + 1] = (pixel >> 2) & 255;
            data[i + 2] = (pixel >> 4) & 255;
            data[i + 3] = 255;
          }
          return new ImageData(data, width, height);
        },
      };
    }
  };
}

export function createOrthoCamera(EASEL, width, height, viewHeight) {
  const aspect = width / height;
  return new EASEL.OrthographicCamera({
    left: (-viewHeight * aspect) / 2,
    right: (viewHeight * aspect) / 2,
    top: viewHeight / 2,
    bottom: -viewHeight / 2,
    near: 0.1,
    far: 200,
  });
}

export function createSpriteTexture(EASEL, size) {
  const data = new Uint8ClampedArray(size * size * 4);
  const center = (size - 1) * 0.5;
  const radius = size * 0.42;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = dist <= radius ? 255 : 0;
      data[i] = 210;
      data[i + 1] = 228;
      data[i + 2] = 255;
      data[i + 3] = alpha;
    }
  }
  return new EASEL.DataTexture(data, size, size);
}

export function createCheckerTexture(EASEL, size) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const checker = ((x >> 3) + (y >> 3)) & 1;
      const value = checker === 0 ? 224 : 48;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return new EASEL.DataTexture(data, size, size);
}

export function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
