# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js ist ein TypeScript-3D-Renderer für Browser-Canvas2D. Es bietet einen
Szenengraphen im THREE-Stil und eine CPU-Rasterisierungspipeline ohne WebGL.

Der Renderer ist nützlich für deterministische Pixel, Retro-3D,
Software-Rendering-Experimente und Code, der prüfbare Rasterisierungsstufen
benötigt. Er verwendet affine UV-Mapping, Nächste-Nachbar-Texturen, diskrete
Opazität und CPU-Tiefentest. Er implementiert kein PBR, keine Shadow Maps,
keine Shader und keine GPU-Ressourcen.

[Website](https://easeljs.org) - [Beispiele](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Sprachen:** English - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
**Deutsch** - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Installation

```sh
bun add @xsyetopz/easel
```

Stattdessen von JSR installieren:

```sh
bunx jsr add @xsyetopz/easel
```

### Beispiel

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

Wenn alles richtig ist, sehen Sie ein [weiß rotierendes Quadrat](https://jsfiddle.net/v34j18zf/1/)

Siehe [migration-0.7.md](references/migration-0.7.md) für Upgrades von 0.6 auf 0.7.

## Renderer-Grenzen

- Canvas2D-Ausgabe über `ImageData`; kein WebGL oder WebGPU.
- Flat- und Gouraud-Beleuchtung werden auf der CPU berechnet.
- Affine UV-Interpolation. Perspektivische Texturen können sich verzerren.
- Bildtexturen werden auf 128×128 begrenzt und verwenden normalisierte
  Texel-Zellen-Nächste-Nachbor-Sampling; Atlas-UVs sollten Texelzentren
  ansteuern.
- Geometrie-RGB-Farattribute multiplizieren Material-, Textur-, Instanz- und
  gebackene Lichtfarben. Flächen mit einheitlicher Farbe behalten den
  Flat-Rasterpfad.
- Transparente Objekte hängen von sortierter Zeichenreihenfolge ab.
- Opazität verwendet feste Stufen statt kontinuierlichem Alpha.

Siehe die [API-Referenz](https://easeljs.org/docs) und
[Beispiele](https://easeljs.org/examples), ausgerichtet an unterstützten
three.js-Konzepten für Animation, Steuerung und Raycaster, ohne WebGL- oder
WebGPU-exklusive Demos.

## Agent-Skills

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
bun run biome:lint
bun run www:build
```

Führen Sie `bun run release:check` vor einem Release aus. Das Veröffentlichen
erfolgt ausschließlich durch den geschützten GitHub-Actions-Workflow.

## Mitwirken

Lesen Sie [CONTRIBUTING.md](CONTRIBUTING.md) vor dem Öffnen eines Pull-Requests.
Projektstruktur und Renderer-Grenzen sind in [AGENTS.md](AGENTS.md) dokumentiert.

## Mitwirken und Programmier-Agenten

- Personen: Lesen Sie [`CONTRIBUTING.md`](CONTRIBUTING.md) vor dem Einreichen
  einer Änderung.
- Programmier-Agenten: Lesen Sie [`AGENTS.md`](AGENTS.md) vor dem Ändern von
  Dateien oder der Verwendung von Repository-Werkzeugen.
- Übersetzungen: keine.

## Lizenz

[MIT](LICENSE)
