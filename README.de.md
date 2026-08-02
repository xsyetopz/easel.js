# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js ist ein TypeScript-3D-Renderer für Canvas2D im Browser. Er bietet einen
THREE-ähnlichen Szenengraphen und eine CPU-Rasterisierungspipeline ohne WebGL.

Der Renderer eignet sich für deterministische Pixel, Retro-3D, Experimente mit
Software-Rendering und Code, der inspizierbare Rasterisierungsstufen benötigt.
Er verwendet affine UV-Zuordnung, Texturen mit Nächstnachbar-Abtastung, diskrete
Opazität und CPU-Tiefentests. PBR, Schattenkarten, Shader und GPU-Ressourcen
werden nicht implementiert.

[Website](https://easeljs.org) - [Beispiele](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Sprachen:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) -
[Français](README.fr.md) - Deutsch - [日本語](README.ja.md) -
[한국어](README.ko.md) - [Русский](README.ru.md) - [العربية](README.ar.md) -
[हिन्दी](README.hi.md)

## Installation

```sh
bun add @xsyetopz/easel
```

Installation über JSR:

```sh
bunx jsr add @xsyetopz/easel
```

## Beispiel

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

## Einschränkungen des Renderers

- Canvas2D-Ausgabe über `ImageData`; kein WebGL und kein WebGPU.
- Flache und Gouraud-Beleuchtung, auf der CPU berechnet.
- Affine UV-Interpolation. Perspektivische Texturen können sich verziehen.
- Bildtexturen sind auf 128×128 begrenzt und verwenden Nächstnachbar-Abtastung.
- Transparente Objekte hängen von einer sortierten Zeichenreihenfolge ab.
- Die Opazität verwendet feste Stufen statt kontinuierlichem Alpha.

Siehe die [API-Referenz](https://easeljs.org/docs) und die
[Beispiele](https://easeljs.org/examples) für Kameras, Geometrie, Materialien,
Texturen, Animation, Picking, Loader, Helfer und Voxel-Szenen.

## Agenten-Skills

Dieses Repository enthält portable Skills für die EASEL.js-Entwicklung und die
Migration von THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Entwicklung

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

Führe `bun run release:check` vor einer Veröffentlichung aus. Die
Veröffentlichung erfolgt ausschließlich über den geschützten GitHub-Actions-
Workflow.

## Mitwirken

Lies [CONTRIBUTING.md](CONTRIBUTING.md), bevor du einen Pull Request eröffnest.
Die Projektstruktur und die Grenzen des Renderers sind in [AGENTS.md](AGENTS.md)
dokumentiert.

## Lizenz

[MIT](LICENSE)
