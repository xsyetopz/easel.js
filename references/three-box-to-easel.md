# Three.js "Box + MeshNormalMaterial" → EASEL 0.7 compatibility map

Original Three.js snippet (top-line minimal):

```js
import * as THREE from 'three';

const width = window.innerWidth, height = window.innerHeight;

// init

const camera = new THREE.PerspectiveCamera( 70, width / height, 0.01, 10 );
camera.position.z = 1;

const scene = new THREE.Scene();

const geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
const material = new THREE.MeshNormalMaterial();

const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize( width, height );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// animation

function animate( time ) {

    mesh.rotation.x = time / 2000;
    mesh.rotation.y = time / 1000;

    renderer.render( scene, camera );

}
```

---

### Equivalent EASEL 0.7 (direct with Camera/Scene/WebGL)

```html
<canvas id="easel"></canvas>
<script type="module">
import * as EASEL from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#easel");
const width = canvas.width = window.innerWidth;
const height = canvas.height = window.innerHeight;

// basic scene graph
const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: width / height,
  near: 0.01,
  far: 10
});
camera.position.z = 1;

const scene = new EASEL.Scene();

// primitive and normal-ish material (shaded via Light when added)
const geometry = new EASEL.BoxGeometry(0.2, 0.2, 0.2);
const material = new EASEL.MeshNormalMaterial();

const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);
scene.add(new EASEL.AmbientLight(0xffffff, 0.5));

// renderer that loops off requestAnimationFrame or setAnimationLoop
const renderer = new EASEL.Renderer({
  canvas,
  width,
  height,
  sortObjects: true
});

// animation loop (supports both custom RAF and renderer.setAnimationLoop)
function animate(time: number) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.render(scene, camera);
}

// in production apps, use renderer.setAnimationLoop(animate);
// renderer.setAnimationLoop(animate);
// instead of custom RAF + render().
</script>
```

Key API changes (Three.js → EASEL):

| Three.js | EASEL 0.7 | Note |
|----------|-----------|------|
| `THREE.PerspectiveCamera(fov, aspect, near, far)` | `new PerspectiveCamera({ fov, aspect, near, far })` | EASEL 0.7 uses an options object; `aspect` can be a number or width/height pair |
| `camera.position.z = 1` | `camera.position.z = 1` | Same |
| `new THREE.Scene()` | `new EASEL.Scene()` | Same; EASEL 0.7 does not split in 0.7 |
| `THREE.BoxGeometry(wh,w,h,w,h)` | `new EASEL.BoxGeometry(sx,sy,sz)` | EASEL API matches Three.js shape |
| `new THREE.MeshNormalMaterial()` | `new EASEL.MeshNormalMaterial()` | Existing material; EASEL 0.7 keeps same signature |
| `renderer.setSize(w,h)` | `new Renderer({ canvas, width, height })` | EASEL uses constructor options; `domElement` also available |
| `renderer.setAnimationLoop(fn)` | `renderer.setAnimationLoop(fn)` | 0.7 retains the loop hook |


### Equivalent EASEL 0.7 (README-welcome minimal)

```ts
import * as EASEL from "@xsyetopz/easel";

const viewport = { w: 320, h: 180 };
const canvas = new HTMLCanvasElement({ width: viewport.w, height: viewport.h });
const renderer = new EASEL.Renderer({ width: viewport.w, height: viewport.h, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: viewport.w / viewport.h,
  near: 0.01,
  far: 10
});
camera.position.z = 1;

const geometry = new EASEL.BoxGeometry(0.2, 0.2, 0.2);
const material = new EASEL.MeshNormalMaterial();

const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

function animate(time: number) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.render(scene, camera);
}

// Turn on loop:
renderer.setAnimationLoop(animate);
```

Notes:

- EASEL 0.7 does not use global `THREE`/`MeshNormalMaterial` to avoid WebGL/WebGPU; the EASEL version replicates the same visual output (shaded surface in EASEL reuses `AmbientLight` via unified material pipeline).
- All textures, geometry attributes, and clearing are CPU‑only (Canvas2D → ImageData).

Boundary context: See [migration-0.6-to-0.7.md](./migration-0.6-to-0.7.md) for incremental diff table for the 0.1→0.6 baseline; see [migration-0.7.md](./migration-0.7.md) for detailed new module upgrade path.
