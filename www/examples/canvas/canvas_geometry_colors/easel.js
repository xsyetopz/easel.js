import {
  Attribute,
  BasicMaterial,
  CanvasTexture,
  Color,
  DirectionalLight,
  IcosahedronGeometry,
  LambertMaterial,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Renderer,
  Scene,
  Shading,
  SRGBColorSpace,
} from "@/index.js";

import { createExampleAnimationLoop } from "../../../runtime/example-animation.ts";

export const meta = {
  id: "canvas_geometry_colors",
  upstream: "webgl_geometry_colors",
  name: "geometry / colors",
  category: "canvas",
  animated: true,
  description:
    "Three flat-shaded icosahedra with hue, saturation and red-to-yellow vertex color gradients and black wireframe overlays float above soft canvas-texture shadows while the camera follows the pointer.",
  differences: [
    "MeshPhongMaterial with shininess 0 becomes an EASEL LambertMaterial with flat baked lighting, which has no specular term; with shininess 0 the Phong highlight is a faint uniform sheen that the port drops.",
    "EASEL's Color.setRGB rejects components outside 0 to 1, so the third icosahedron's green channel is clamped at 0 before it is stored; three.js stores the negative value and clamps at output, which only changes the gradient on the top faces slightly.",
    "EASEL lights each vertex in linear space and encodes it to sRGB before interpolating across the face, where three.js interpolates in linear space and encodes per pixel, so the gradients blend slightly darker between vertices.",
    "The black wireframe overlay shares the faces' depth, so EASEL's depth test hides short stretches of some edges where three.js draws them unbroken.",
    "The upstream page follows the mouse over the whole window; the embedded stage follows the pointer over its canvas, measured from the canvas center.",
  ],
};
export const controls = [];

export function setup(canvas) {
  let mouseX = 0;
  let mouseY = 0;

  const camera = new PerspectiveCamera({
    fov: 20,
    aspect: canvas.width / canvas.height,
    near: 1,
    far: 10000,
  });
  camera.position.z = 1800;

  const scene = new Scene();
  scene.background = 0xffffff;

  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(0, 0, 1);
  scene.add(light);

  // shadow

  const shadowCanvas = canvas.ownerDocument?.createElement?.("canvas");
  let shadowTexture;
  if (shadowCanvas) {
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;

    const context = shadowCanvas.getContext("2d");
    const gradient = context.createRadialGradient(
      shadowCanvas.width / 2,
      shadowCanvas.height / 2,
      0,
      shadowCanvas.width / 2,
      shadowCanvas.height / 2,
      shadowCanvas.width / 2,
    );
    gradient.addColorStop(0.1, "rgba(210,210,210,1)");
    gradient.addColorStop(1, "rgba(255,255,255,1)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);

    // EASEL copies the canvas into its texture cache only on update().
    shadowTexture = new CanvasTexture(shadowCanvas);
    shadowTexture.update();
  }

  const shadowMaterial = new BasicMaterial({
    map: shadowTexture,
    vertexColors: false,
  });
  const shadowGeo = new PlaneGeometry(300, 300, 1, 1);

  let shadowMesh;

  shadowMesh = new Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.position.x = -400;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.position.x = 400;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  const radius = 200;

  const geometry1 = new IcosahedronGeometry(radius, 1);

  const count = geometry1.getAttribute("position").count;
  geometry1.setAttribute(
    "color",
    new Attribute(new Float32Array(count * 3), 3),
  );

  const geometry2 = geometry1.clone();
  const geometry3 = geometry1.clone();

  const color = new Color();
  const positions1 = geometry1.getAttribute("position");
  const positions2 = geometry2.getAttribute("position");
  const positions3 = geometry3.getAttribute("position");
  const colors1 = geometry1.getAttribute("color");
  const colors2 = geometry2.getAttribute("color");
  const colors3 = geometry3.getAttribute("color");

  for (let i = 0; i < count; i++) {
    color.setHSL(
      (positions1.getY(i) / radius + 1) / 2,
      1.0,
      0.5,
      SRGBColorSpace,
    );
    colors1.setXYZ(i, color.r, color.g, color.b);

    color.setHSL(0, (positions2.getY(i) / radius + 1) / 2, 0.5, SRGBColorSpace);
    colors2.setXYZ(i, color.r, color.g, color.b);

    color.setRGB(
      1,
      Math.max(0, 0.8 - (positions3.getY(i) / radius + 1) / 2),
      0,
      SRGBColorSpace,
    );
    colors3.setXYZ(i, color.r, color.g, color.b);
  }

  const material = new LambertMaterial({
    color: 0xffffff,
    shading: Shading.Flat,
    vertexColors: true,
  });

  const wireframeMaterial = new BasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
    vertexColors: false,
  });

  let mesh = new Mesh(geometry1, material);
  let wireframe = new Mesh(geometry1, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = -400;
  mesh.rotation.x = -1.87;
  scene.add(mesh);

  mesh = new Mesh(geometry2, material);
  wireframe = new Mesh(geometry2, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = 400;
  scene.add(mesh);

  mesh = new Mesh(geometry3, material);
  wireframe = new Mesh(geometry3, wireframeMaterial);
  mesh.add(wireframe);
  scene.add(mesh);

  const renderer = new Renderer({
    canvas,
    width: canvas.width,
    height: canvas.height,
  });

  // The upstream page listens on document and centers on the window; the
  // embedded stage listens on its canvas and centers on the canvas.
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left - rect.width / 2;
    mouseY = event.clientY - rect.top - rect.height / 2;
  }
  canvas.addEventListener("pointermove", onPointerMove);

  //

  function render() {
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;

    camera.lookAt(scene.position);

    renderer.prepare(scene, camera);
    renderer.render(scene, camera);
  }

  const animation = createExampleAnimationLoop(render);

  return {
    ...animation,
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    },
    cleanup() {
      animation.cleanup();
      canvas.removeEventListener("pointermove", onPointerMove);
      shadowGeo.dispose();
      shadowTexture?.dispose();
      shadowMaterial.dispose();
      geometry1.dispose();
      geometry2.dispose();
      geometry3.dispose();
      material.dispose();
      wireframeMaterial.dispose();
      renderer.dispose();
    },
  };
}

export const easelSource = `import * as EASEL from "@xsyetopz/easel";

const geometry = new EASEL.IcosahedronGeometry(200, 1);
const count = geometry.getAttribute("position").count;
geometry.setAttribute("color", new EASEL.Attribute(new Float32Array(count * 3), 3));

const positions = geometry.getAttribute("position");
const colors = geometry.getAttribute("color");
const color = new EASEL.Color();
for (let i = 0; i < count; i++) {
  color.setHSL((positions.getY(i) / 200 + 1) / 2, 1.0, 0.5, EASEL.SRGBColorSpace);
  colors.setXYZ(i, color.r, color.g, color.b);
}

const material = new EASEL.LambertMaterial({
  color: 0xffffff,
  shading: EASEL.Shading.Flat,
  vertexColors: true,
});
const mesh = new EASEL.Mesh(geometry, material);
mesh.add(new EASEL.Mesh(geometry, new EASEL.BasicMaterial({
  color: 0x000000,
  wireframe: true,
  vertexColors: false,
})));
scene.add(mesh);

renderer.prepare(scene, camera);
renderer.render(scene, camera);`;

export const example = { meta, controls, setup, easelSource };
