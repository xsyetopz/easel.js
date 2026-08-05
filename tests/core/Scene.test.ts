import { describe, expect, it } from "bun:test";
import { Color } from "@/math/Color.js";
import { Node } from "@/core/Node.js";
import { Scene } from "@/core/Scene.js";
import { Fog } from "@/scenes/Fog.js";

describe("Scene", () => {
  it("has type='Scene'", () => {
    const scene = new Scene();
    expect(scene.type).toBe("Scene");
    expect(scene.isScene).toBe(true);
    expect("autoUpdate" in scene).toBe(false);
  });

  it("fog defaults to undefined", () => {
    const scene = new Scene();
    expect(scene.fog).toBeUndefined();
  });

  it("fog can be assigned", () => {
    const scene = new Scene();
    const fog = new Fog({ far: 100 });
    scene.fog = fog;
    expect(scene.fog).toBe(fog);
  });

  it("inherits from Node", () => {
    const scene = new Scene();
    expect(scene).toBeInstanceOf(Node);
  });

  it("can add children", () => {
    const scene = new Scene();
    const child = new Node();
    scene.add(child);
    expect(scene.children).toContain(child);
  });

  it("clone returns a deep scene copy", () => {
    const scene = new Scene();
    const background = new Color(0x123456);
    const fog = new Fog({ color: 0x334455, far: 100 });
    scene.background = background;
    scene.fog = fog;
    scene.add(new Node());
    const c = scene.clone();
    expect(c).toBeInstanceOf(Scene);
    expect(c.type).toBe("Scene");
    expect(c.background).not.toBe(background);
    expect(c.background).toEqual(background);
    expect(c.fog).not.toBe(fog);
    expect(c.fog?.toJSON()).toEqual(fog.toJSON());
    expect(c.children).toHaveLength(1);
  });

  it("serializes background and fog without null sentinels", () => {
    const scene = new Scene({ uuid: "00000000-0000-4000-8000-000000000020" });
    scene.background = new Color(0x102030);
    scene.fog = new Fog({ color: 0x304050, near: 5, far: 25 });

    expect(scene.toJSON()).toMatchObject({
      uuid: scene.uuid,
      type: "Scene",
      background: 0x102030,
      fog: {
        type: "Fog",
        name: "",
        color: 0x304050,
        near: 5,
        far: 25,
      },
    });
    expect(scene.toJSON()).not.toHaveProperty("environment");
  });
});
