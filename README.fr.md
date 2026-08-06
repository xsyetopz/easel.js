# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js est un moteur de rendu 3D en TypeScript pour Canvas2D dans le
navigateur. Il fournit un graphe de scène de style THREE et un pipeline de
rastérisisation CPU sans WebGL.

Le moteur de rendu est utile pour des pixels déterministes, la 3D rétro, des
expériences de rendu logiciel et du code nécessitant des étapes de
rastérisation inspectables. Il utilise un mapping UV affine, des textures au
plus proche voisin, une opacité discrète et un test de profondeur CPU. Il
n'implémente pas PBR, les cartes d'ombres, les shaders ni les ressources GPU.

[Site web](https://easeljs.org) - [Exemples](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Langues :** [English](README.md) - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - **Français** -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Installation

```sh
bun add @xsyetopz/easel
```

Pour installer depuis JSR à la place :

```sh
bunx jsr add @xsyetopz/easel
```

### Exemple

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

Si tout est correct, vous verrez un [carré blanc en rotation](https://jsfiddle.net/v34j18zf/1/)

Consultez [migration-0.7.md](references/migration-0.7.md) pour les mises à
niveau de 0.6 vers 0.7.

## Limites du moteur de rendu

- Sortie Canvas2D via `ImageData` ; pas de WebGL ni de WebGPU.
- Éclairage flat et Gouraud calculé sur le CPU.
- Interpolation UV affine. Les textures en perspective peuvent se déformer.
- Les textures image sont limitées à 128×128 et utilisent un échantillonnage
  normalisé au plus proche voisin par cellule de texel ; les UV d'atlas
  devraient cibler les centres des texels.
- Les attributs de couleur RGB de la géométrie multiplient les couleurs de
  matériau, de texture, d'instance et d'éclairage précalculé. Les faces à
  couleur uniforme conservent le chemin de rastérisation flat.
- Les objets transparents dépendent de l'ordre de dessin trié.
- L'opacité utilise des paliers fixes plutôt qu'un alpha continu.

Consultez la [référence API](https://easeljs.org/docs) et les
[exemples](https://easeljs.org/examples) alignés avec les concepts
d'animation, de contrôles et de raycaster pris en charge de three.js, sans
WebGL ni démos exclusives WebGPU.

## Compétences d'agent

Ce dépôt inclut des compétences portables pour le développement EASEL.js et la
migration depuis THREE.js :

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Développement

```sh
bun install
bun test
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

## Contribution et agents de codage

- Contributeurs : lisez [`CONTRIBUTING.md`](CONTRIBUTING.md) avant de soumettre
  une modification.
- Agents de codage : lisez [`AGENTS.md`](AGENTS.md) avant de modifier des
  fichiers ou d'utiliser les outils du dépôt.
- Traductions : aucune.

## Licence

[MIT](LICENSE)
