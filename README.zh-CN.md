# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js 是一个基于 TypeScript 的浏览器 Canvas2D 3D 渲染器。它提供了
THREE 风格的场景图以及无需 WebGL 的 CPU 光栅化管线。

该渲染器适用于确定性像素输出、复古 3D、软件渲染实验，以及需要可检视
光栅化阶段的代码。它使用仿射 UV 映射、最近邻纹理、离散不透明度和 CPU
深度测试。它不实现 PBR、阴影贴图、着色器或 GPU 资源。

[官网](https://easeljs.org) - [示例](https://easeljs.org/examples) -
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

改为从 JSR 安装：

```sh
bunx jsr add @xsyetopz/easel
```

### 示例

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

如果一切正确，你会看到一个[旋转的白色方块](https://jsfiddle.net/v34j18zf/1/)

有关从 0.6 升级到 0.7 的说明，请参阅 [migration-0.7.md](references/migration-0.7.md)。

## 渲染器限制

- 通过 `ImageData` 输出 Canvas2D；不支持 WebGL 或 WebGPU。
- 平面和 Gouraud 光照在 CPU 上计算。
- 仿射 UV 插值。透视纹理可能会变形。
- 图像纹理限制为 128×128，并使用归一化纹素单元
  最近邻采样；图集 UV 应对准纹素中心。
- 几何体 RGB 颜色属性与材质、纹理、实例及
  烘焙光照颜色相乘。均匀颜色的面保留平面光栅路径。
- 透明物体依赖排序后的绘制顺序。
- 不透明度使用固定步进而非连续 alpha。

参见 [API 参考](https://easeljs.org/docs) 和
[示例](https://easeljs.org/examples)，它们对齐了受支持的 three.js 动画、
控制器和射线投射概念，但不包含 WebGL 或 WebGPU 专属演示。

## 代理技能

本仓库包含用于 EASEL.js 开发和 THREE.js 迁移的便携技能：

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## 开发

```sh
bun install
bun test
bun run typecheck
bun run biome:lint
bun run www:build
```

在发布前运行 `bun run release:check`。发布仅由受保护的
GitHub Actions 工作流执行。

## 贡献

在提交拉取请求之前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。项目
结构和渲染器边界记录在 [AGENTS.md](AGENTS.md) 中。

## 贡献与编码代理

- 人类贡献者：在提交更改之前阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
- 编码代理：在更改文件或使用仓库工具之前阅读
  [`AGENTS.md`](AGENTS.md)。
- 翻译：无。

## 许可证

[MIT](LICENSE)
