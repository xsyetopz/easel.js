# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js はブラウザの Canvas2D 向け TypeScript 3D レンダラーです。THREE
スタイルのシーングラフと、WebGL を使用しない CPU ラスタライズパイプラインを提供します。

このレンダラーは、決定論的ピクセル、レトロ 3D、ソフトウェアレンダリングの実験、
および検査可能なラスタライズ段階が必要なコードに有用です。アフィン UV
マッピング、最近隣テクスチャ、離散不透明度、CPU 深度テストを使用します。PBR、
シャドウマップ、シェーダー、GPU リソースは実装していません。

[ウェブサイト](https://easeljs.org) - [例](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**言語:** [English](README.md) - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - **日本語** - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## インストール

```sh
bun add @xsyetopz/easel
```

JSR からインストールする場合:

```sh
bunx jsr add @xsyetopz/easel
```

### 例

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

うまくいけば、[白い回転する四角形](https://jsfiddle.net/v34j18zf/1/)が見えます。

0.6 から 0.7 へのアップグレードについては [migration-0.7.md](references/migration-0.7.md) を参照してください。

## レンダラーの制限事項

- `ImageData` を通じた Canvas2D 出力。WebGL や WebGPU は使用しません。
- CPU 上で計算されるフラットおよび Gouraud ライティング。
- アフィン UV 補間。パースペクティブテクスチャは歪む場合があります。
- 画像テクスチャは 128×128 に制限され、正規化されたテクセルセルの最近隣
  サンプリングを使用します。アトラス UV はテクセル中心をターゲットにすべきです。
- ジオメトリ RGB カラー属性はマテリアル、テクスチャ、インスタンス、および
  ベイク済みライトカラーを乗算します。均一カラーの面はフラットラスタパスを維持します。
- 透明オブジェクトはソート済み描画順序に依存します。
- 不透明度は連続アルファではなく固定ステップを使用します。

サポートされている three.js のアニメーション、コントロール、レイキャスターの概念に
対応した [API リファレンス](https://easeljs.org/docs) と
[例](https://easeljs.org/examples) を参照してください。WebGL や WebGPU
専用のデモは含まれません。

## エージェントスキル

このリポジトリには EASEL.js 開発と THREE.js マイグレーションのための
ポータブルスキルが含まれています:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## 開発

```sh
bun install
bun test
bun run typecheck
bun run biome:lint
bun run www:build
```

リリース前に `bun run release:check` を実行してください。公開は保護された
GitHub Actions ワークフローによってのみ実行されます。

## コントリビュート

プルリクエストを開く前に [CONTRIBUTING.md](CONTRIBUTING.md) をお読みください。
プロジェクト構造とレンダラーの境界については [AGENTS.md](AGENTS.md) に記載されています。

## コントリビュートとコーディングエージェント

- 人間: 変更を提出する前に [`CONTRIBUTING.md`](CONTRIBUTING.md) をお読みください。
- コーディングエージェント: ファイルの変更やリポジトリツールの使用前に
  [`AGENTS.md`](AGENTS.md) をお読みください。
- 翻訳: なし。

## ライセンス

[MIT](LICENSE)
