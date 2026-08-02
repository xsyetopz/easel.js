# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

EASEL.js est un moteur de rendu 3D en TypeScript pour Canvas2D dans le
navigateur. Il fournit un graphe de scène de style THREE et un pipeline de
rastérisation sur CPU sans WebGL.

Le moteur est utile pour produire des pixels déterministes, créer de la 3D
rétro, expérimenter le rendu logiciel et travailler avec du code qui doit
permettre d'inspecter les étapes de rastérisation. Il utilise un mappage UV
affine, des textures avec échantillonnage au plus proche voisin, une opacité
discrète et des tests de profondeur sur CPU. Il n'implémente ni PBR, ni cartes
d'ombres, ni shaders, ni ressources GPU.

[Site web](https://easeljs.org) - [Exemples](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Langues :** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) - Français -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Installation

```sh
bun add @xsyetopz/easel
```

Pour installer depuis JSR :

```sh
bunx jsr add @xsyetopz/easel
```

## Exemple

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

## Limites du moteur de rendu

- Sortie Canvas2D via `ImageData` ; pas de WebGL ni de WebGPU.
- Éclairage plat et Gouraud calculé sur le CPU.
- Interpolation UV affine. Les textures en perspective peuvent être déformées.
- Les textures d'image sont limitées à 128×128 et utilisent un échantillonnage
  au plus proche voisin.
- Les objets transparents dépendent de l'ordre de dessin trié.
- L'opacité utilise des niveaux fixes plutôt qu'un alpha continu.

Consultez la [référence de l'API](https://easeljs.org/docs) et les
[exemples](https://easeljs.org/examples) pour les caméras, la géométrie, les
matériaux, les textures, l'animation, la sélection (picking), les chargeurs, les
helpers et les scènes de voxels.

## Compétences pour agents

Ce dépôt inclut des compétences portables pour le développement EASEL.js et la
migration depuis THREE.js :

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Développement

```sh
bun install
bun run test:run
bun run typecheck
bun run biome:check
bun run www:build
```

Exécutez `bun run release:check` avant une publication. La publication est
effectuée uniquement par le workflow GitHub Actions protégé.

## Contribution

Lisez [CONTRIBUTING.md](CONTRIBUTING.md) avant d'ouvrir une pull request. La
structure du projet et les limites du moteur de rendu sont documentées dans
[AGENTS.md](AGENTS.md).

## Licence

[ISC](LICENSE)
