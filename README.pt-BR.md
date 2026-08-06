# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js é um renderizador 3D em TypeScript para Canvas2D no navegador. Ele
fornece um grafo de cena no estilo THREE e um pipeline de rasterização por CPU
sem WebGL.

O renderizador é útil para pixels determinísticos, 3D retrô, experimentos de
renderização por software e código que precisa de estágios de rasterização
inspecionáveis. Ele usa mapeamento UV afim, texturas com nearest-neighbor,
opacidade discreta e teste de profundidade por CPU. Não implementa PBR, shadow
maps, shaders ou recursos de GPU.

[Website](https://easeljs.org) - [Exemplos](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Idiomas:** English - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
**Português** - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Instalação

```sh
bun add @xsyetopz/easel
```

Para instalar via JSR:

```sh
bunx jsr add @xsyetopz/easel
```

### Exemplo

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

Se tudo estiver correto, você verá um [quadrado branco girando](https://jsfiddle.net/v34j18zf/1/)

Consulte [migration-0.7.md](references/migration-0.7.md) para atualizações da versão 0.6 para 0.7.

## Limites do renderizador

- Saída Canvas2D via `ImageData`; sem WebGL ou WebGPU.
- Iluminação flat e Gouraud calculada na CPU.
- Interpolação UV afim. Texturas em perspectiva podem sofrer distorção.
- Texturas de imagem limitadas a 128×128 usando amostragem normalizada
  nearest-neighbor por célula de texel; UVs de atlas devem visar os centros dos
  texels.
- Atributos de cor RGB da geometria multiplicam as cores do material, textura,
  instância e iluminação pré-calculada. Faces com cor uniforme mantêm o caminho
  de rasterização flat.
- Objetos transparentes dependem da ordem de desenho ordenada.
- A opacidade usa passos fixos em vez de alfa contínuo.

Consulte a [referência de API](https://easeljs.org/docs) e os
[exemplos](https://easeljs.org/examples) alinhados aos conceitos suportados de
animação, controles e raycaster do three.js, sem WebGL ou demos exclusivos de
WebGPU.

## Agent skills

Este repositório inclui skills portáveis para desenvolvimento com EASEL.js e
migração do THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Desenvolvimento

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

Execute `bun run release:check` antes de um release. A publicação é realizada
apenas pelo workflow protegido do GitHub Actions.

## Contribuindo

Leia [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir um pull request. A
estrutura do projeto e os limites do renderizador estão documentados em
[AGENTS.md](AGENTS.md).

## Contribuindo e agentes de codificação

- Pessoas: leia [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de enviar uma alteração.
- Agentes de codificação: leia [`AGENTS.md`](AGENTS.md) antes de alterar arquivos
  ou usar ferramentas do repositório.
- Traduções: nenhuma.

## Licença

[MIT](LICENSE)
