# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

EASEL.js é um renderizador 3D em TypeScript para Canvas2D no navegador. Ele
oferece um grafo de cena no estilo do THREE e um pipeline de rasterização em CPU
sem WebGL.

O renderizador é útil para gerar pixels determinísticos, criar 3D retrô, fazer
experimentos de renderização por software e trabalhar com código que precisa de
etapas de rasterização inspecionáveis. Ele usa mapeamento UV afim, texturas com
amostragem pelo vizinho mais próximo, opacidade discreta e testes de
profundidade em CPU. Não implementa PBR, mapas de sombra, shaders nem recursos
de GPU.

[Site](https://easeljs.org) - [Exemplos](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Idiomas:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - Português - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Instalação

```sh
bun add @xsyetopz/easel
```

Para instalar pelo JSR:

```sh
bunx jsr add @xsyetopz/easel
```

## Exemplo

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

## Limites do renderizador

- Saída Canvas2D por meio de `ImageData`; sem WebGL ou WebGPU.
- Iluminação plana e Gouraud calculada na CPU.
- Interpolação UV afim. Texturas em perspectiva podem deformar.
- Texturas de imagem são limitadas a 128×128 e usam amostragem pelo vizinho mais
  próximo.
- Objetos transparentes dependem da ordem de desenho classificada.
- A opacidade usa etapas fixas em vez de alfa contínuo.

Consulte a [referência da API](https://easeljs.org/docs) e os
[exemplos](https://easeljs.org/examples) para câmeras, geometrias, materiais,
texturas, animação, seleção (picking), carregadores, helpers e cenas de voxels.

## Skills para agentes

Este repositório inclui skills portáveis para o desenvolvimento com EASEL.js e a
migração de THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Desenvolvimento

```sh
bun install
bun run test:run
bun run typecheck
bun run biome:check
bun run www:build
```

Execute `bun run release:check` antes de uma publicação. A publicação é feita
somente pelo workflow protegido do GitHub Actions.

## Contribuição

Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um pull request. A
estrutura do projeto e os limites do renderizador estão documentados em
[AGENTS.md](AGENTS.md).

## Licença

[ISC](LICENSE)
