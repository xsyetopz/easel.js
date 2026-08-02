# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js は、ブラウザーの Canvas2D 向け TypeScript 3D レンダラーです。THREE 風の
シーングラフと、WebGL を使わない CPU ラスタライズパイプラインを提供します。

このレンダラーは、決定論的なピクセル出力、レトロ
3D、ソフトウェアレンダリングの実験、
ラスタライズ段階を検査できるコードに適しています。アフィン UV
マッピング、最近傍テクスチャ、 離散的な不透明度、CPU
深度テストを使用します。PBR、シャドウマップ、シェーダー、GPU
リソースは実装していません。

[ウェブサイト](https://easeljs.org) - [サンプル](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**言語:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) -
[Français](README.fr.md) - [Deutsch](README.de.md) - 日本語 -
[한국어](README.ko.md) - [Русский](README.ru.md) - [العربية](README.ar.md) -
[हिन्दी](README.hi.md)

## インストール

```sh
bun add @xsyetopz/easel
```

JSR からインストールする場合は、代わりに次を実行します。

```sh
bunx jsr add @xsyetopz/easel
```

## 例

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

## レンダラーの制約

- `ImageData` を通じて Canvas2D に出力します。WebGL と WebGPU は使用しません。
- フラットおよび Gouraud ライティングは CPU で計算されます。
- UV 補間はアフィン補間です。透視投影のテクスチャは歪むことがあります。
- 画像テクスチャは 128×128 に制限され、最近傍サンプリングを使用します。
- 透明オブジェクトはソートされた描画順序に依存します。
- 不透明度は連続アルファではなく固定ステップを使用します。

カメラ、ジオメトリ、マテリアル、テクスチャ、アニメーション、ピッキング、ローダー、ヘルパー、
ボクセルシーンについては、[API リファレンス](https://easeljs.org/docs) と
[サンプル](https://easeljs.org/examples) を参照してください。

## エージェントスキル

このリポジトリには、EASEL.js の開発と THREE.js
の移行に使えるポータブルスキルが含まれています。

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## 開発

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

リリース前に `bun run release:check` を実行してください。公開は保護された GitHub
Actions ワークフローからのみ行われます。

## コントリビューション

プルリクエストを開く前に [CONTRIBUTING.md](CONTRIBUTING.md)
をお読みください。プロジェクトの構成と レンダラーの境界は [AGENTS.md](AGENTS.md)
に記載されています。

## ライセンス

[MIT](LICENSE)
