import {
  AmbientLight,
  GLTFLoader,
  PerspectiveCamera,
  Renderer,
  Scene,
  Timer,
  Vector3,
} from "@/index.js";

function dataUri(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:application/octet-stream;base64,${globalThis.btoa(binary)}`;
}

function baseDocument(bytes, bufferViews, accessors, node) {
  return {
    asset: { version: "2.0" },
    buffers: [{ uri: dataUri(bytes), byteLength: bytes.byteLength }],
    bufferViews,
    accessors,
    materials: [
      {
        name: "Material",
        pbrMetallicRoughness: { baseColorFactor: [0.25, 0.65, 1, 1] },
      },
      {
        name: "Variant material",
        pbrMetallicRoughness: { baseColorFactor: [1, 0.3, 0.2, 1] },
      },
    ],
    meshes: [
      {
        name: "Triangle",
        primitives: [{ attributes: { POSITION: 0 }, material: 0 }],
      },
    ],
    nodes: [node],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
}

export function makeInstancingDocument() {
  const values = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, -1, 0, 0, 1, 0, 0, 0, 1, 0,
  ]);
  const bytes = new Uint8Array(values.buffer);
  return baseDocument(
    bytes,
    [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: 60, byteLength: 24 },
    ],
    [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: 2, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 2, type: "VEC3" },
    ],
    {
      name: "Instances",
      mesh: 0,
      extensions: {
        EXT_mesh_gpu_instancing: {
          attributes: { TRANSLATION: 1, _COLOR_0: 2 },
        },
      },
    },
  );
}

export function makeLodDocument() {
  const values = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const document = baseDocument(
    new Uint8Array(values.buffer),
    [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
    {
      name: "High detail",
      mesh: 0,
      extras: { MSFT_screencoverage: [0.5, 0.2, 0.01] },
      extensions: { MSFT_lod: { ids: [1, 2] } },
    },
  );
  document.nodes.push(
    { name: "Medium detail", mesh: 0 },
    { name: "Low detail", mesh: 0 },
  );
  return document;
}

export function makeVariantsDocument() {
  const values = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const document = baseDocument(
    new Uint8Array(values.buffer),
    [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
    { name: "Variants", mesh: 0 },
  );
  document.extensions = {
    KHR_materials_variants: { variants: [{ name: "Warm" }, { name: "Cool" }] },
  };
  document.meshes[0].primitives[0].extensions = {
    KHR_materials_variants: {
      mappings: [{ material: 1, variants: [0, 1] }],
    },
  };
  return document;
}

export function mountGLTFExample(canvas, document) {
  const width = canvas.width || 640;
  const height = canvas.height || 360;
  const scene = new Scene();
  scene.background = 0x101622;
  const camera = new PerspectiveCamera({
    fov: 42,
    aspect: width / height,
    near: 0.1,
    far: 50,
  });
  camera.position.set(0, 0, 4);
  camera.lookAt(new Vector3(0, 0, 0));
  const renderer = new Renderer({ canvas, width, height });
  scene.add(new AmbientLight(0xffffff, 0.55));
  const result = new GLTFLoader().parse(document, { materialType: "lambert" });
  scene.add(result.scene);
  const timer = new Timer();
  let frame;
  function animate() {
    frame = globalThis.requestAnimationFrame(animate);
    result.scene.rotation.y += timer.update().delta * 0.3;
    result.scene.updateMatrixWorld(true, true);
    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }
  animate();
  return {
    cleanup() {
      if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
      renderer.dispose();
    },
  };
}
