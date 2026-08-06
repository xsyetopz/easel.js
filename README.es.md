# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js es un renderizador 3D en TypeScript para Canvas2D del navegador.
Proporciona un grafo de escena estilo THREE y un pipeline de rasterización por
CPU sin WebGL.

El renderizador es útil para píxeles deterministas, 3D retro, experimentos de
renderizado por software y código que necesita etapas de rasterización
inspeccionables. Usa mapeo UV afín, texturas de vecino más cercano, opacidad
discreta y prueba de profundidad por CPU. No implementa PBR, mapas de sombras,
shaders ni recursos de GPU.

[Sitio web](https://easeljs.org) - [Ejemplos](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Idiomas:** [English](README.md) - [简体中文](README.zh-CN.md) - **Español** -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Instalación

```sh
bun add @xsyetopz/easel
```

Para instalar desde JSR en su lugar:

```sh
bunx jsr add @xsyetopz/easel
```

### Ejemplo

```ts
import * as EASEL from "@xsyetopz/easel";

const width = globalThis.innerWidth, height = globalThis.innerHeight;

// init

const camera = new EASEL.PerspectiveCamera({
  fov: 70,
  aspect: width / height,
  near: 0.01,
  far: 10,
});
camera.position.z = 1;

const scene = new EASEL.Scene();

const geometry = new EASEL.BoxGeometry(0.2, 0.2, 0.2);
const material = new EASEL.BasicMaterial();

const mesh = new EASEL.Mesh(geometry, material);
scene.add(mesh);

const renderer = new EASEL.Renderer({ width, height });
document.body.appendChild(renderer.domElement);

// animation

function animate(time) {
  mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

Si está hecho correctamente, verás un [cuadrado blanco rotando](https://jsfiddle.net/v34j18zf/1/)

Consulta [migration-0.7.md](references/migration-0.7.md) para actualizaciones de 0.6 a 0.7.

## Límites del renderizador

- Salida Canvas2D a través de `ImageData`; sin WebGL ni WebGPU.
- Iluminación plana y Gouraud calculada en la CPU.
- Interpolación UV afín. Las texturas en perspectiva pueden deformarse.
- Las texturas de imagen se limitan a 128×128 y usan muestreo de vecino más
  cercano normalizado por celda de texel; los UVs de atlas deben apuntar a los
  centros de los texeles.
- Los atributos de color RGB de la geometría multiplican el color del material,
  textura, instancia e iluminación precalculada. Las caras de color uniforme
  conservan la ruta de rasterización plana.
- Los objetos transparentes dependen del orden de dibujado ordenado.
- La opacidad usa pasos fijos en lugar de alfa continuo.

Consulta la [referencia de la API](https://easeljs.org/docs) y los
[ejemplos](https://easeljs.org/examples) alineados con los conceptos de
animación, controles y raycaster de three.js soportados, sin WebGL ni demos
exclusivas de WebGPU.

## Habilidades de agentes

Este repositorio incluye habilidades portátiles para el desarrollo con EASEL.js
y la migración desde THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Desarrollo

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

Ejecuta `bun run release:check` antes de un lanzamiento. La publicación se
realiza únicamente mediante el flujo de trabajo protegido de GitHub Actions.

## Contribución

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request. La
estructura del proyecto y los límites del renderizador están documentados en
[AGENTS.md](AGENTS.md).

## Contribución y agentes de programación

- Personas: lee [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de enviar un cambio.
- Agentes de programación: lee [`AGENTS.md`](AGENTS.md) antes de modificar
  archivos o usar las herramientas del repositorio.
- Traducciones: ninguna.

## Licencia

[MIT](LICENSE)
