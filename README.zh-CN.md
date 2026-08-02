# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js 是一个面向浏览器 Canvas2D 的 TypeScript 3D 渲染器。它提供 THREE
风格的场景图，以及无需 WebGL 的 CPU 光栅化管线。

该渲染器适用于确定性像素、复古
3D、软件渲染实验，以及需要检查光栅化阶段的代码。它使用 仿射 UV
映射、最近邻纹理、离散不透明度和 CPU 深度测试。不实现 PBR、阴影贴图、着色器或
GPU 资源。

[网站](https://easeljs.org) - [示例](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**语言：** [English](README.md) - 简体中文 - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## 安装

```sh
bun add @xsyetopz/easel
```

要从 JSR 安装，请改用：

```sh
bunx jsr add @xsyetopz/easel
```

## 示例

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

## 渲染器限制

- 通过 `ImageData` 输出 Canvas2D；不支持 WebGL 或 WebGPU。
- 平面和 Gouraud 光照在 CPU 上计算。
- 使用仿射 UV 插值。透视纹理可能发生变形。
- 图像纹理限制为 128×128，并使用最近邻采样。
- 透明对象依赖排序后的绘制顺序。
- 不透明度使用固定步长，而非连续 alpha。

有关相机、几何体、材质、纹理、动画、拾取、加载器、辅助对象和体素场景， 请参阅
[API 参考](https://easeljs.org/docs) 和 [示例](https://easeljs.org/examples)。

## Agent 技能

此仓库包含用于 EASEL.js 开发和 THREE.js 迁移的可移植技能：

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## 开发

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

发布前请运行 `bun run release:check`。发布操作仅通过受保护的 GitHub Actions
工作流执行。

## 贡献

提交拉取请求前，请先阅读
[CONTRIBUTING.md](CONTRIBUTING.md)。项目结构和渲染器边界记录在
[AGENTS.md](AGENTS.md) 中。

## 许可证

[MIT](LICENSE)
