import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const assets = {
  "gltf/simple-instancing/SimpleInstancing.gltf":
    "a01695630e6459c945826c7ff8dde74784de8279f60b9b62604980dc7486340e",
  "gltf/simple-instancing/SimpleInstancing.bin":
    "29d38705c2a619f30374e80413be61f2e855dd9ec59c499201000aa53715a73c",
  "pcd/simple.pcd":
    "eaba763d849fd6caf9a0addd39c54596f40abdac463cb1891cec36aa18b44832",
  "xyz/helix_201.xyz":
    "489c27c4b619c9a47c15df62ebb7a5474791a7ae85f0c9c3f8323a9504288519",
  "gcode/test_m82.gcode":
    "b36c5f3cca7cbee6f55fff5bdd5a79d78f549a5756f2a86192d4055aad5c6d46",
  "gcode/test_m83.gcode":
    "d2b75d9e03cc1bc992e88198d4e7339f2398d9dfa5f9247412ad514612c88ebe",
  "gltf/AnimatedMorphSphere/AnimatedMorphSphere.gltf":
    "3513fe07ad24f9a8bbb47a961d2d7474b5ff22dbbf87f9273e5982562ced2aee",
  "gltf/AnimatedMorphSphere/AnimatedMorphSphere.bin":
    "ce13772de449d2c577cc960bc5f74a7c572e886c15046c73eb028023f9c7d167",
  "nrrd/stent.nrrd":
    "10f1a6e39cb113ba1357342e4df17c270edf4e98ea123a22d71462ff8f61aa11",
  "textures/sprites/disc.png":
    "1f3816715f028ac32065a10f40f5ef218b4efc67eb46f0d908a8d503f25b69cb",
  "vox/monu10.vox":
    "acbe999679307a698b68fdec935a526a3b243006d20933e4ba22b72a0374ef90",
  "svg/emptyPath.svg":
    "01200b186770c8a6df13b04509a83a161fcd3530084714bb2e533dbe6ec07f21",
  "svg/energy.svg":
    "13967a23d1e36832431e08d2b583a9ab27378793d201acf87862ea09dc2930aa",
  "svg/hexagon.svg":
    "b2e71c748128a36c74eccb6f2e703d3f96673f7f30d83d6ebf4cebf4171bdfa2",
  "svg/lineJoinsAndCaps.svg":
    "fbb7fcb4436029da0fade1f8deaa59f9791d102f1bd449cbc37b430757eb3ca7",
  "svg/multiple-css-classes.svg":
    "31cf266c9a182a639232aa9eddf824c4dd9bb105ed3074190dd727302c8479f5",
  "svg/singlePointTest.svg":
    "197c4367dfd2d873caa83ae38549470fd39c74bff388a918f152052711040b09",
  "svg/singlePointTest2.svg":
    "8640811964d64f2dcc4b47782ed76e9760afa655809fe33bb32033deffabdc38",
  "svg/singlePointTest3.svg":
    "5e66ef09cb29bdbd2cb767793050ded931c709bc8df87cbcadb49e7dcac86b65",
  "svg/style-css-inside-defs.svg":
    "fb67ee113a5ad04401ae712d3586cf1378afd39fe81e0e7f6579653fea0cb019",
  "svg/styled-paths.svg":
    "b57e563f1ce5e1ad8cfae4e4526b8e44d886c9263e4ea4b16b401a10be93c29d",
  "svg/tests/1.svg":
    "177ec36979ec90dcaf22c5cfec12655279290381b62f27c4311675929f28cce7",
  "svg/tests/2.svg":
    "e491688ba5d636365a60c5816fa2f24b6b9bcb762620b217d37bd8ae32b4f0d1",
  "svg/tests/3.svg":
    "1f41f5d8d0219626cb0709397f7cfbd6626f2d707c8c2f4b0affa7400045a319",
  "svg/tests/4.svg":
    "2e6e1868a1291e3cca79c532cfd6d9251de69340ab39930dc279c24bb59ae8dc",
  "svg/tests/5.svg":
    "0cb9a4f46a5b9925f315b1e1a0ecbc225105a337e03e9c6d619691ef4f5d6863",
  "svg/tests/6.svg":
    "a789806193afddee2802c9cf0c7140e9ed78b1540ef1a76045931f46dfcd5dc2",
  "svg/tests/7.svg":
    "93fa09cd417d595b3ff0e565574abd4a3a92c27382c4b17df4c09dd63f3f00f0",
  "svg/tests/8.svg":
    "b5774309181f3f8a3b39595fd6fb51bf40fa39a01da22efd984753206f89d2d1",
  "svg/tests/9.svg":
    "652fe0f1c6fb4d4b75d0a85e620c1d57acb98921b734b91c3e864995a6cc991a",
  "svg/tests/ellipseTransform.svg":
    "810f339b4f2f0e9b273673f32f9f57fcd49a4db2023292910cc3b7eea35649e0",
  "svg/tests/letter.svg":
    "101dd17a2c90bc73cf15f38b55512cb340967397f31239709291a43e0390d1e8",
  "svg/tests/ordering.svg":
    "3915ce72ce740d9d4ad067982c33953ee6279be0315142f930862885df8cfec1",
  "svg/tests/roundJoinPrecisionIssue.svg":
    "700bb2b90a0de9f3fc8735dc96fb1b90d2cf97c1a51dad3fa9a792d2a3e8e170",
  "svg/tests/styles.svg":
    "5153d2bff15a1372ac8ba39c48a9eb6b311e630ec6a4b87e958f03243627921d",
  "svg/tests/units.svg":
    "58e4f3b4548b220aeb789d0348ad2fc7c7158b577ce8f0caa0957f8c7b7554d4",
  "svg/tests/wideStroke.svg":
    "073a9e401a7d303ae2366dc91db4120c9644e91c9bd6567c36a24e7f0cd06ce0",
  "svg/zero-radius.svg":
    "0524324812eb6f2cf0a791a19c467472abdbfe9ac15aa7e120c90ec6ff75cc76",
  "textures/crate.gif":
    "a890f0a89eadc083cb39bfbe597c1395d7acf47a19f673b5643d4a9c174ea52f",
  "bvh/spin.bvh":
    "399b06d5a38dda3ea2f0939faa139212caf456f1677c3d44e0e7602d0ddb5504",
  "textures/square-outline-textured.png":
    "a217d5f472ae122acd2107d0f5dbd225ba8e197998e89fee579dd5b11fd3e717",
  "textures/crate_grey8.tga":
    "6ae83da1bc71f79c03b8bf87bfff664a8b81847297806bb2cf12ef96d29588fa",
  "textures/crate_color8.tga":
    "b3c7ca4ea77ecd215f086dc5bea152e183e202c108aa77982130efa3eaed8d9d",
  "textures/equirectangular/spruit_sunrise_2k.hdr.jpg":
    "867a853b9076fd7e6a6e0f38ca5f613ff6bbc672191720bf24af828e6384b62d",
} as const;

describe("example assets", () => {
  for (const [path, expected] of Object.entries(assets)) {
    it(`keeps ${path} pinned`, () => {
      const contents = readFileSync(
        new URL(`../../assets/${path}`, import.meta.url),
      );
      expect(createHash("sha256").update(contents).digest("hex")).toBe(
        expected,
      );
    });
  }

  it("keeps binary transport encodings byte-equivalent", () => {
    for (const path of [
      "gltf/AnimatedMorphSphere/AnimatedMorphSphere.bin",
      "nrrd/stent.nrrd",
      "textures/sprites/disc.png",
      "vox/monu10.vox",
      "textures/crate.gif",
      "textures/square-outline-textured.png",
      "textures/crate_grey8.tga",
      "textures/crate_color8.tga",
      "textures/equirectangular/spruit_sunrise_2k.hdr.jpg",
    ]) {
      const binary = readFileSync(
        new URL(`../../assets/${path}`, import.meta.url),
      );
      const encoded = readFileSync(
        new URL(`../../assets/${path}.base64`, import.meta.url),
        "utf8",
      );
      expect(
        Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0)),
      ).toEqual(new Uint8Array(binary));
    }
  });
});
