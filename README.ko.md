# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js는 브라우저 Canvas2D를 위한 TypeScript 3D 렌더러입니다. THREE 스타일의
씬 그래프와 WebGL 없이 동작하는 CPU 래스터화 파이프라인을 제공합니다.

이 렌더러는 결정론적 픽셀, 레트로 3D, 소프트웨어 렌더링 실험, 그리고 검사 가능한
래스터화 단계가 필요한 코드에 유용합니다. 어피니 UV 매핑, 최근접 이웃 텍스처,
이산 불투명도, CPU 깊이 테스트를 사용합니다. PBR, 섀도 맵, 셰이더 또는 GPU 리소스는
구현하지 않습니다.

[웹사이트](https://easeljs.org) - [예제](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**언어:** [English](README.md) - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - 한국어 -
[Русский](README.ru.md) - [العربية](README.ar.md) - [हिन्दी](README.hi.md)

## 설치

```sh
bun add @xsyetopz/easel
```

대신 JSR에서 설치하려면:

```sh
bunx jsr add @xsyetopz/easel
```

### 예제

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

제대로 실행되면 [회전하는 흰색 사각형](https://jsfiddle.net/v34j18zf/1/)이 보입니다.

0.6에서 0.7로 업그레이드하려면 [migration-0.7.md](references/migration-0.7.md)를 참고하세요.

## 렌더러 제한 사항

- `ImageData`를 통한 Canvas2D 출력. WebGL 또는 WebGPU 없음.
- CPU에서 계산되는 플랫 및 구로 셰이딩.
- 어피니 UV 보간. 원근 텍스처는 왜곡될 수 있음.
- 이미지 텍스처는 128×128로 제한되며 정규화된 텍셀 셀 최근접 이웃 샘플링을
  사용. 아틀라스 UV는 텍셀 중심을 향해야 함.
- 지오메트리 RGB 색상 속성은 머티리얼, 텍스처, 인스턴스 및 베이크된 조명 색상과
  곱해짐. 균일 색상 면은 플랫 래스터 경로를 유지.
- 투명 객체는 정렬된 드로우 순서에 의존.
- 불투명도는 연속 알파 대신 고정 단계를 사용.

WebGL 또는 WebGPU 전용 데모 없이 지원되는 three.js 애니메이션, 컨트롤, 레이캐스터
개념에 맞춰 정렬된 [API 레퍼런스](https://easeljs.org/docs) 및
[예제](https://easeljs.org/examples)를 참고하세요.

## 에이전트 스킬

이 저장소에는 EASEL.js 개발과 THREE.js 마이그레이션을 위한 휴대용 스킬이 포함되어
있습니다:

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

릴리스 전에 `bun run release:check`를 실행하세요. 게시는 보호된 GitHub Actions
워크플로우를 통해서만 수행됩니다.

## 기여하기

풀 리퀘스트를 열기 전에 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어주세요. 프로젝트
구조와 렌더러 경계는 [AGENTS.md](AGENTS.md)에 문서화되어 있습니다.

## 기여 및 코딩 에이전트

- 사람: 변경 사항을 제출하기 전에 [`CONTRIBUTING.md`](CONTRIBUTING.md)를 읽어주세요.
- 코딩 에이전트: 파일을 변경하거나 저장소 도구를 사용하기 전에
  [`AGENTS.md`](AGENTS.md)를 읽어주세요.
- 번역: 없음.

## 라이선스

[MIT](LICENSE)
