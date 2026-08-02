# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

EASEL.js es un renderizador 3D escrito en TypeScript para Canvas2D en el
navegador. Ofrece un grafo de escena al estilo de THREE y una canalización de
rasterización en CPU sin WebGL.

El renderizador resulta útil para obtener píxeles deterministas, crear gráficos
3D retro, experimentar con renderizado por software y trabajar con código que
necesita etapas de rasterización inspeccionables. Utiliza mapeo UV afín,
texturas con muestreo de vecino más cercano, opacidad discreta y pruebas de
profundidad en CPU. No implementa PBR, mapas de sombras, shaders ni recursos de
GPU.

[Sitio web](https://easeljs.org) - [Ejemplos](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Idiomas:** [English](README.md) - [简体中文](README.zh-CN.md) - Español -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Instalación

```sh
bun add @xsyetopz/easel
```

Como alternativa, instálalo desde JSR:

```sh
bunx jsr add @xsyetopz/easel
```

## Ejemplo

```html
<canvas id="scene"></canvas>
<script type="module" src="/src/main.ts"></script>
```

```ts
import {
    AmbientLight,
    BoxGeometry,
    LambertMaterial,
    Mesh,
    OrthographicCamera,
    Renderer,
    Scene,
} from "@xsyetopz/easel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing #scene canvas");

const renderer = new Renderer({ canvas, width: 640, height: 360 });
const scene = new Scene();
scene.background = 0x18_1c_24;

const camera = new OrthographicCamera({
    left: -3.2,
    right: 3.2,
    top: 1.8,
    bottom: -1.8,
    near: 0.1,
    far: 100,
});
camera.position.set(0, 0, 5);

scene.add(new AmbientLight(0xff_ff_ff, 0.6));
const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new LambertMaterial({ color: 0xff_55_44 }),
);
scene.add(cube);

function frame(): void {
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
}
frame();
```

## Límites del renderizador

- Salida Canvas2D mediante `ImageData`; sin WebGL ni WebGPU.
- Iluminación plana y Gouraud calculada en CPU.
- Interpolación UV afín. Las texturas en perspectiva pueden deformarse.
- Las texturas de imagen se limitan a 128×128 y usan muestreo de vecino más
  cercano.
- Los objetos transparentes dependen del orden de dibujo clasificado.
- La opacidad utiliza pasos fijos en lugar de alfa continuo.

Consulta la [referencia de la API](https://easeljs.org/docs) y los
[ejemplos](https://easeljs.org/examples) para obtener información sobre cámaras,
geometría, materiales, texturas, animación, selección (picking), cargadores,
helpers y escenas de vóxeles.

## Habilidades para agentes

Este repositorio incluye habilidades portátiles para el desarrollo con EASEL.js
y la migración desde THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Desarrollo

```sh
bun install
bun run test:run
bun run typecheck
bun run biome:check
bun run www:build
```

Ejecuta `bun run release:check` antes de publicar una versión. La publicación
solo se realiza mediante el flujo de trabajo protegido de GitHub Actions.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request. La
estructura del proyecto y los límites del renderizador están documentados en
[AGENTS.md](AGENTS.md).

## Licencia

[ISC](LICENSE)
