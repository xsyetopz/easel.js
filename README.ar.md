# EASEL.js

[![CI](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml/badge.svg)](https://github.com/xsyetopz/easel.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@xsyetopz/easel)](https://www.npmjs.com/package/@xsyetopz/easel)
[![JSR](https://jsr.io/badges/@xsyetopz/easel)](https://jsr.io/@xsyetopz/easel)
[![ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

EASEL.js هو مُصيِّر ثلاثي الأبعاد مكتوب بـ TypeScript لـ Canvas2D في المتصفح. وهو
يوفّر مخطط مشاهد على نمط THREE وخط أنابيب للتنقيط على CPU من دون WebGL.

هذا المصيّر مناسب للبكسلات الحتمية، ورسوميات 3D بطابع قديم، وتجارب التصيير
البرمجي، والشفرة التي تحتاج إلى مراحل تنقيط قابلة للفحص. ويستخدم تعيين UV
أفينيًا، وقوامات بأخذ عينات لأقرب جار، وعتامة متقطعة، واختبار عمق على CPU. ولا يطبّق
PBR أو خرائط الظلال أو المظلّلات أو موارد GPU.

[الموقع](https://easeljs.org) - [الأمثلة](https://easeljs.org/examples) -
[واجهة API](https://easeljs.org/docs) -
[npm](https://www.npmjs.com/package/@xsyetopz/easel) -
[JSR](https://jsr.io/@xsyetopz/easel)

**اللغات:** [English](README.md) - [简体中文](README.zh-CN.md) -
[Español](README.es.md) - [Português](README.pt-BR.md) -
[Français](README.fr.md) - [Deutsch](README.de.md) - [日本語](README.ja.md) -
[한국어](README.ko.md) - [Русский](README.ru.md) - العربية -
[हिन्दी](README.hi.md)

## التثبيت

```sh
bun add @xsyetopz/easel
```

للتثبيت من JSR بدلًا من ذلك:

```sh
bunx jsr add @xsyetopz/easel
```

## مثال

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

## حدود المصيّر

- إخراج Canvas2D عبر `ImageData`؛ لا WebGL أو WebGPU.
- تُحسب إضاءة Flat وGouraud على CPU.
- استيفاء UV أفيني. قد تتشوّه قوامات المنظور.
- تُقيَّد قوامات الصور إلى 128×128 وتستخدم أخذ عينات لأقرب جار.
- تعتمد الكائنات الشفافة على ترتيب رسم مُرتَّب.
- تستخدم العتامة خطوات ثابتة بدلًا من ألفا مستمرة.

راجع [مرجع API](https://easeljs.org/docs)
و[الأمثلة](https://easeljs.org/examples) للكاميرات والهندسة والمواد والقوامات
والتحريك والالتقاط والمحملات والمساعدات ومشاهد فوكسل.

## مهارات الوكلاء

يتضمن هذا المستودع مهارات قابلة للنقل لتطوير EASEL.js وترحيل THREE.js:

```sh
bunx skills add xsyetopz/easel.js --skill using-easeljs
bunx skills add xsyetopz/easel.js --skill threejs-to-easeljs
```

## التطوير

```sh
bun install
bun run test:run
bun run typecheck
bun run biome:check
bun run www:build
```

شغّل `bun run release:check` قبل الإصدار. لا يتم النشر إلا من خلال سير عمل GitHub
Actions محمي.

## المساهمة

اقرأ [CONTRIBUTING.md](CONTRIBUTING.md) قبل فتح طلب سحب. تم توثيق بنية المشروع
وحدود المصيّر في [AGENTS.md](AGENTS.md).

## الترخيص

[ISC](LICENSE)
