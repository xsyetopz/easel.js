# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EASEL.js ब्राउज़र Canvas2D के लिए एक TypeScript 3D रेंडरर है। यह एक THREE-शैली
का सीन ग्राफ़ और WebGL के बिना एक CPU रास्टराइज़ेशन पाइपलाइन प्रदान करता है।

यह रेंडरर नियतांकीय पिक्सेल, रेट्रो 3D, सॉफ़्टवेयर-रेंडरिंग प्रयोगों, और ऐसे
कोड के लिए उपयोगी है जिसे निरीक्षण योग्य रास्टराइज़ेशन चरणों की आवश्यकता होती है। यह
affine UV मैपिंग, nearest-neighbor टेक्सचर, असतत अपारदर्शिता, और CPU गहराई
परीक्षण का उपयोग करता है। यह PBR, शैडो मैप, शेडर, या GPU संसाधन लागू नहीं करता।

[वेबसाइट](https://easeljs.org) - [उदाहरण](https://easeljs.org/examples) -
[API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**भाषाएँ:** [English](README.md) - [简体中文](README.zh-CN.md) - [Español](README.es.md) -
[Português](README.pt-BR.md) - [Français](README.fr.md) -
[Deutsch](README.de.md) - [日本語](README.ja.md) - [한국어](README.ko.md) -
[Русский](README.ru.md) - [العربية](README.ar.md) - हिन्दी

## इंस्टॉल करें

```sh
bun add @xsyetopz/easel
```

JSR से इंस्टॉल करने के लिए:

```sh
bunx jsr add @xsyetopz/easel
```

### उदाहरण

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

सही किया तो, आपको एक [सफ़ेद घूमता हुआ वर्ग](https://jsfiddle.net/v34j18zf/1/) दिखाई देगा।

0.6 से 0.7 में अपग्रेड के लिए [migration-0.7.md](references/migration-0.7.md) देखें।

## रेंडरर सीमाएँ

- `ImageData` के माध्यम से Canvas2D आउटपुट; कोई WebGL या WebGPU नहीं।
- CPU पर गणना की गई flat और Gouraud लाइटिंग।
- Affine UV इंटरपोलेशन। Perspective टेक्सचर विकृत हो सकते हैं।
- इमेज टेक्सचर 128×128 तक सीमित हैं और सामान्यीकृत texel-cell
  nearest-neighbor सैंपलिंग का उपयोग करते हैं; atlas UV को texel केंद्रों को
  लक्षित करना चाहिए।
- ज्योमेट्री RGB रंग विशेषताएँ material, texture, instance, और
  baked-light रंगों को गुणा करती हैं। एकसमान-रंग वाले फेस flat रास्टर पथ बनाए रखते हैं।
- पारदर्शी वस्तुएँ क्रमबद्ध ड्रा क्रम पर निर्भर करती हैं।
- अपारदर्शिता सतत अल्फ़ा के बजाय निश्चित चरणों का उपयोग करती है।

[API संदर्भ](https://easeljs.org/docs) और [उदाहरण](https://easeljs.org/examples)
देखें जो समर्थित three.js एनिमेशन, कंट्रोल, और raycaster अवधारणाओं के अनुरूप हैं बिना
WebGL या WebGPU-केवल डेमो के।

## एजेंट कौशल

इस रिपॉज़िटरी में EASEL.js विकास और THREE.js माइग्रेशन के लिए पोर्टेबल कौशल शामिल हैं:

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

रिलीज़ से पहले `bun run release:check` चलाएँ। प्रकाशन केवल सुरक्षित
GitHub Actions वर्कफ़्लो द्वारा किया जाता है।

## योगदान

पुल अनुरोध खोलने से पहले [CONTRIBUTING.md](CONTRIBUTING.md) पढ़ें। प्रोजेक्ट
संरचना और रेंडरर सीमाएँ [AGENTS.md](AGENTS.md) में प्रलेखित हैं।

## योगदान और कोडिंग एजेंट

- लोग: कोई परिवर्तन सबमिट करने से पहले [`CONTRIBUTING.md`](CONTRIBUTING.md) पढ़ें।
- कोडिंग एजेंट: फ़ाइलें बदलने या रिपॉज़िटरी टूल का उपयोग करने से पहले
  [`AGENTS.md`](AGENTS.md) पढ़ें।
- अनुवाद: कोई नहीं।

## लाइसेंस

[MIT](LICENSE)
