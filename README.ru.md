# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js — это 3D-рендерер на TypeScript для браузерного Canvas2D. Он
предоставляет граф сцены в стиле THREE и конвейер CPU-растеризации без WebGL.

Рендерер полезен для детерминированных пикселей, ретро-3D, экспериментов с
программным рендерингом и кода, требующего инспектируемых этапов растеризации.
Он использует аффинное UV-преобразование, текстуры с ближайшей выборкой,
дискретную прозрачность и проверку глубины на CPU. Он не реализует PBR,
карты теней, шейдеры или GPU-ресурсы.

[Сайт](https://easeljs.org) - [Примеры](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**Языки:** [English](README.md) - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
**Русский** - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## Установка

```sh
bun add @xsyetopz/easel
```

Чтобы установить из JSR:

```sh
bunx jsr add @xsyetopz/easel
```

### Пример

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

Если всё сделано правильно, вы увидите [вращающийся белый квадрат](https://jsfiddle.net/v34j18zf/1/)

См. [migration-0.7.md](references/migration-0.7.md) для перехода с 0.6 на 0.7.

## Ограничения рендерера

- Вывод через Canvas2D посредством `ImageData`; без WebGL или WebGPU.
- Плоское и Гуро-освещение рассчитывается на CPU.
- Аффинная UV-интерполяция. Перспективные текстуры могут искажаться.
- Текстуры изображений ограничены 128×128 и используют нормализованную выборку
  ближайшего текселя; UV атласов следует центрировать на текселях.
- Цветовые атрибуты RGB геометрии умножаются на цвета материала, текстуры,
  инстанса и запечённого освещения. Грани с однородным цветом сохраняют
  плоский путь растеризации.
- Прозрачные объекты зависят от отсортированного порядка отрисовки.
- Прозрачность использует фиксированные шаги, а не непрерывный альфа-канал.

См. [справочник API](https://easeljs.org/docs) и
[примеры](https://easeljs.org/examples), выровненные по поддерживаемым концепциям
анимации, управления и raycaster из three.js, без WebGL или демо только для WebGPU.

## Навыки агентов

Этот репозиторий включает переносимые навыки для разработки на EASEL.js и
миграции с THREE.js:

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

Запустите `bun run release:check` перед релизом. Публикация выполняется только
через защищённый рабочий процесс GitHub Actions.

## Участие в проекте

Прочитайте [CONTRIBUTING.md](CONTRIBUTING.md) перед открытием pull request.
Структура проекта и границы рендерера описаны в [AGENTS.md](AGENTS.md).

## Участие и агенты-кодеры

- Люди: прочитайте [`CONTRIBUTING.md`](CONTRIBUTING.md) перед отправкой изменений.
- Агенты-кодеры: прочитайте [`AGENTS.md`](AGENTS.md) перед изменением файлов
  или использованием инструментов репозитория.
- Переводы: отсутствуют.

## Лицензия

[MIT](LICENSE)
