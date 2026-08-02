# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js ब्राउज़र के Canvas2D के लिए TypeScript में बना 3D रेंडरर है। यह THREE-शैली का सीन
ग्राफ़ और WebGL के बिना CPU रास्टराइज़ेशन पाइपलाइन उपलब्ध कराता है।

यह रेंडरर नियतात्मक पिक्सेल, रेट्रो 3D, सॉफ़्टवेयर-रेंडरिंग प्रयोगों और ऐसे कोड के लिए उपयोगी है
जिन्हें निरीक्षण योग्य रास्टराइज़ेशन चरण चाहिए। इसमें affine UV mapping, nearest-neighbor
textures, discrete opacity और CPU depth testing का उपयोग होता है। यह PBR, shadow
maps, shaders या GPU resources लागू नहीं करता।

[वेबसाइट](https://easeljs.org) - [उदाहरण](https://easeljs.org/examples) -
[API संदर्भ](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**भाषाएँ:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) -
[Français](README.fr.md) - [Deutsch](README.de.md) - [日本語](README.ja.md) -
[한국어](README.ko.md) - [Русский](README.ru.md) - [العربية](README.ar.md) -
हिन्दी

## इंस्टॉल करें

```sh
bun add @xsyetopz/easel
```

JSR से इंस्टॉल करने के लिए:

```sh
bunx jsr add @xsyetopz/easel
```

## उदाहरण

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

## रेंडरर की सीमाएँ

- `ImageData` के माध्यम से Canvas2D आउटपुट; WebGL या WebGPU नहीं।
- Flat और Gouraud लाइटिंग की गणना CPU पर होती है।
- Affine UV interpolation। Perspective textures विकृत हो सकती हैं।
- Image textures 128×128 तक सीमित हैं और nearest-neighbor sampling का उपयोग करती
  हैं।
- Transparent objects sorted draw order पर निर्भर करते हैं।
- Opacity continuous alpha के बजाय fixed steps का उपयोग करती है।

कैमरा, ज्योमेट्री, मटेरियल, टेक्सचर, एनीमेशन, पिकिंग, लोडर, हेल्पर और वॉक्सेल सीन के लिए
[API संदर्भ](https://easeljs.org/docs) और [उदाहरण](https://easeljs.org/examples)
देखें।

## एजेंट स्किल्स

इस रिपॉज़िटरी में EASEL.js विकास और THREE.js माइग्रेशन के लिए पोर्टेबल स्किल्स शामिल हैं:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## विकास

```sh
bun install
bun test
bun run typecheck
bun run biome:check
bun run www:build
```

रिलीज़ से पहले `bun run release:check` चलाएँ। प्रकाशन केवल सुरक्षित GitHub Actions
वर्कफ़्लो के ज़रिए किया जाता है।

## योगदान

पुल रिक्वेस्ट खोलने से पहले [CONTRIBUTING.md](CONTRIBUTING.md) पढ़ें। प्रोजेक्ट की संरचना और
रेंडरर की सीमाएँ [AGENTS.md](AGENTS.md) में दर्ज हैं।

## लाइसेंस

[MIT](LICENSE)
