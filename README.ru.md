# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js - TypeScript-рендерер 3D-сцен для браузерного Canvas2D. Он
предоставляет граф сцены в стиле THREE и конвейер растеризации на CPU без WebGL.

Рендерер подходит для детерминированных пикселей, ретро-3D, экспериментов с
программным рендерингом и кода, которому нужны проверяемые этапы растеризации.
Он использует аффинное отображение UV, текстуры с выборкой по ближайшему соседу,
дискретную непрозрачность и проверку глубины на CPU. PBR, карты теней, шейдеры и
ресурсы GPU не реализованы.

[Сайт](https://easeljs.org) - [Примеры](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Языки:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) -
[Français](README.fr.md) - [Deutsch](README.de.md) - [日本語](README.ja.md) -
[한국어](README.ko.md) - Русский - [العربية](README.ar.md) -
[हिन्दी](README.hi.md)

## Установка

```sh
bun add @xsyetopz/easel
```

Для установки из JSR:

```sh
bunx jsr add @xsyetopz/easel
```

## Пример

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

## Ограничения рендерера

- Вывод Canvas2D через `ImageData`; без WebGL и WebGPU.
- Освещение Flat и Gouraud вычисляется на CPU.
- Аффинная интерполяция UV. Текстуры перспективной камеры могут искажаться.
- Текстуры изображений ограничены размером 128×128 и используют выборку по
  ближайшему соседу.
- Прозрачные объекты зависят от отсортированного порядка отрисовки.
- Непрозрачность использует фиксированные шаги вместо непрерывного альфа-канала.

См. [справочник API](https://easeljs.org/docs) и
[примеры](https://easeljs.org/examples) с камерами, геометрией, материалами,
текстурами, анимацией, выбором объектов, загрузчиками, вспомогательными
объектами и воксельными сценами.

## Навыки для агентов

В этом репозитории есть переносимые навыки для разработки EASEL.js и миграции с
THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## Разработка

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

Перед выпуском запустите `bun run release:check`. Публикация выполняется только
защищённым рабочим процессом GitHub Actions.

## Участие в разработке

Перед открытием pull request прочтите [CONTRIBUTING.md](CONTRIBUTING.md).
Структура проекта и границы рендерера описаны в [AGENTS.md](AGENTS.md).

## Лицензия

[MIT](LICENSE)
