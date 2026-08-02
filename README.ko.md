# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js는 브라우저 Canvas2D를 위한 TypeScript 3D 렌더러입니다. THREE 스타일 씬
그래프와 WebGL 없이 동작하는 CPU 래스터화 파이프라인을 제공합니다.

이 렌더러는 결정론적 픽셀 출력, 레트로 3D, 소프트웨어 렌더링 실험, 래스터화
단계를 검사할 수 있는 코드에 유용합니다. 아핀 UV 매핑, 최근접 텍스처, 불연속
불투명도, CPU 깊이 테스트를 사용합니다. PBR, 섀도 맵, 셰이더 또는 GPU 리소스는
구현하지 않습니다.

[웹사이트](https://easeljs.org) - [예제](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**언어:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) -
[Français](README.fr.md) - [Deutsch](README.de.md) - [日本語](README.ja.md) -
한국어 - [Русский](README.ru.md) - [العربية](README.ar.md) -
[हिन्दी](README.hi.md)

## 설치

```sh
bun add @xsyetopz/easel
```

JSR에서 설치하려면 대신 다음을 실행하세요.

```sh
bunx jsr add @xsyetopz/easel
```

## 예제

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

## 렌더러 제한

- `ImageData`를 통해 Canvas2D로 출력하며 WebGL이나 WebGPU는 사용하지 않습니다.
- 평면 및 Gouraud 조명은 CPU에서 계산됩니다.
- UV 보간은 아핀 방식입니다. 원근 카메라의 텍스처는 왜곡될 수 있습니다.
- 이미지 텍스처는 128×128로 제한되며 최근접 샘플링을 사용합니다.
- 투명 객체는 정렬된 그리기 순서에 의존합니다.
- 불투명도는 연속적인 알파가 아닌 고정 단계로 처리됩니다.

카메라, 지오메트리, 머티리얼, 텍스처, 애니메이션, 피킹, 로더, 헬퍼, 복셀 장면은
[API 레퍼런스](https://easeljs.org/docs)와
[예제](https://easeljs.org/examples)를 참조하세요.

## 에이전트 스킬

이 저장소에는 EASEL.js 개발과 THREE.js 마이그레이션을 위한 이식 가능한 스킬이
포함되어 있습니다.

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## 개발

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

릴리스 전에 `bun run release:check`를 실행하세요. 배포는 보호된 GitHub Actions
워크플로를 통해서만 수행됩니다.

## 기여

풀 리퀘스트를 열기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어 주세요.
프로젝트 구조와 렌더러 경계는 [AGENTS.md](AGENTS.md)에 문서화되어 있습니다.

## 라이선스

[MIT](LICENSE)
