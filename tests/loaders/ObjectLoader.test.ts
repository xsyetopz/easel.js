import { describe, expect, it } from "bun:test";
import { OrthographicCamera } from "@/cameras/OrthographicCamera.ts";
import { PerspectiveCamera } from "@/cameras/PerspectiveCamera.ts";
import { Node } from "@/core/Node.ts";
import { Scene } from "@/core/Scene.ts";
import { AmbientLight } from "@/lights/AmbientLight.ts";
import { DirectionalLight } from "@/lights/DirectionalLight.ts";
import { HemisphereLight } from "@/lights/HemisphereLight.ts";
import { LightProbe } from "@/lights/LightProbe.ts";
import { PointLight } from "@/lights/PointLight.ts";
import { SpotLight } from "@/lights/SpotLight.ts";
import { ObjectLoader } from "@/loaders/ObjectLoader.ts";
import { SphericalHarmonics3 } from "@/math/SphericalHarmonics3.ts";
import { Vector3 } from "@/math/Vector3.ts";
import { Group } from "@/objects/Group.ts";
import { Fog, FogExp2 } from "@/scenes/Fog.ts";

describe("ObjectLoader", () => {
  it("round-trips the canonical Node JSON representation", () => {
    const root = new Node({ uuid: "00000000-0000-4000-8000-000000000001" });
    root.name = "root";
    root.position.set(1, 2, 3);
    root.rotateY(Math.PI / 3);
    root.scale.set(2, 3, 4);
    root.up.set(0, 0, 1);
    root.pivot = new Vector3(0.5, 0.25, 0);
    root.userData = { role: "spawn" };
    const child = new Node({ uuid: "00000000-0000-4000-8000-000000000002" });
    child.visible = false;
    root.add(child);

    const loaded = new ObjectLoader().parse(root.toJSON());
    expect(loaded.uuid).toBe(root.uuid);
    expect(loaded.name).toBe("root");
    expect(loaded.position.x).toBe(1);
    expect(loaded.quaternion.y).toBeCloseTo(root.quaternion.y);
    expect(loaded.scale.z).toBe(4);
    expect(loaded.up.z).toBe(1);
    expect(loaded.pivot?.x).toBe(0.5);
    expect(loaded.userData).toEqual({ role: "spawn" });
    expect(loaded.children[0]?.uuid).toBe(child.uuid);
    expect(loaded.children[0]?.visible).toBe(false);
  });

  it("restores concrete scene, group, and light records", () => {
    const scene = new Scene({
      uuid: "00000000-0000-4000-8000-000000000010",
    });
    const group = new Group({
      uuid: "00000000-0000-4000-8000-000000000011",
    });
    const lights = [
      new AmbientLight(0x112233, 2),
      new DirectionalLight(0x223344, 3),
      new HemisphereLight(0x334455, 0x445566, 4),
      new PointLight(0x556677, 5, 6, 7),
      new SpotLight(0x667788, 8, 9, 0.4, 0.25, 10),
      new LightProbe(
        new SphericalHarmonics3().fromArray(new Array(27).fill(0.125)),
        11,
      ),
    ];
    group.add(...lights);
    scene.add(group);

    const json = scene.toJSON();
    const loaded = new ObjectLoader().parse(json);
    const loadedGroup = loaded.children[0];

    expect(loaded).toBeInstanceOf(Scene);
    expect(loaded.uuid).toBe(scene.uuid);
    expect(loadedGroup).toBeInstanceOf(Group);
    expect(loadedGroup?.uuid).toBe(group.uuid);
    expect(loadedGroup?.children[0]).toBeInstanceOf(AmbientLight);
    expect(loadedGroup?.children[1]).toBeInstanceOf(DirectionalLight);
    expect(loadedGroup?.children[2]).toBeInstanceOf(HemisphereLight);
    expect(loadedGroup?.children[3]).toBeInstanceOf(PointLight);
    expect(loadedGroup?.children[4]).toBeInstanceOf(SpotLight);
    expect(loadedGroup?.children[5]).toBeInstanceOf(LightProbe);

    const hemisphere = loadedGroup?.children[2] as HemisphereLight;
    const point = loadedGroup?.children[3] as PointLight;
    const spot = loadedGroup?.children[4] as SpotLight;
    const probe = loadedGroup?.children[5] as LightProbe;
    expect(hemisphere.groundColor.hex).toBe(0x445566);
    expect(point.distance).toBe(6);
    expect(point.decay).toBe(7);
    expect(spot.angle).toBe(0.4);
    expect(spot.penumbra).toBe(0.25);
    expect(probe.intensity).toBe(11);
    expect(probe.sh.toArray()).toEqual(new Array(27).fill(0.125));
  });

  it("round-trips bounded scene background and fog state", () => {
    const linearScene = new Scene();
    linearScene.background = 0x123456;
    linearScene.fog = new Fog({ color: 0x334455, near: 2, far: 80 });
    linearScene.fog.name = "distance";
    const expScene = new Scene();
    expScene.fog = new FogExp2(0x778899, 0.02, 120);

    const loadedLinear = new ObjectLoader().parse(
      linearScene.toJSON(),
    ) as Scene;
    const loadedExp = new ObjectLoader().parse(expScene.toJSON()) as Scene;

    expect(loadedLinear.background).toBe(0x123456);
    expect(loadedLinear.fog).toBeInstanceOf(Fog);
    expect(loadedLinear.fog?.name).toBe("distance");
    expect(loadedLinear.fog?.near).toBe(2);
    expect(loadedLinear.fog?.far).toBe(80);
    expect(loadedExp.fog).toBeInstanceOf(FogExp2);
    expect(loadedExp.fog?.density).toBe(0.02);
    expect(loadedExp.fog?.far).toBe(120);
  });

  it("rejects texture backgrounds without a texture resource context", () => {
    expect(() =>
      new ObjectLoader().parse({
        type: "Scene",
        background: { type: "Texture" },
      }),
    ).toThrow("explicit texture resource context");
  });

  it("rejects malformed numeric records before they reach math state", () => {
    const loader = new ObjectLoader();
    expect(() =>
      loader.parse({ type: "PointLight", intensity: Number.NaN }),
    ).toThrow("intensity must be a finite number");
    expect(() => loader.parse({ type: "Node", position: [0, 1] })).toThrow(
      "position must contain 3 finite numbers",
    );
    expect(() => loader.parse({ type: "LightProbe", sh: [0] })).toThrow(
      "sh must contain 27 finite numbers",
    );
    expect(() => loader.parse({ type: "Node", children: [{}] })).not.toThrow();
    expect(() => loader.parse({ type: "Node", children: [null] })).toThrow(
      "each child must be a record",
    );
  });

  it("round-trips concrete camera projection and view state", () => {
    const perspective = new PerspectiveCamera({
      fov: 52,
      aspect: 16 / 9,
      near: 0.25,
      far: 500,
      tileSize: 4,
      zoom: 1.5,
    });
    perspective.focus = 12;
    perspective.filmGauge = 40;
    perspective.filmOffset = 2;
    perspective.setViewOffset(1920, 1080, 960, 0, 960, 1080);

    const orthographic = new OrthographicCamera({
      left: -4,
      right: 6,
      top: 3,
      bottom: -2,
      near: 0.5,
      far: 200,
      tileSize: 2,
      zoom: 2,
    });
    orthographic.setViewOffset(200, 100, 0, 0, 100, 100);
    orthographic.clearViewOffset();

    const loadedPerspective = new ObjectLoader().parse(
      perspective.toJSON(),
    ) as PerspectiveCamera;
    const loadedOrthographic = new ObjectLoader().parse(
      orthographic.toJSON(),
    ) as OrthographicCamera;

    expect(loadedPerspective).toBeInstanceOf(PerspectiveCamera);
    expect(JSON.stringify(loadedPerspective.toJSON())).toBe(
      JSON.stringify(perspective.toJSON()),
    );
    expect(loadedPerspective.projectionMatrix.elements).toEqual(
      perspective.projectionMatrix.elements,
    );
    expect(loadedOrthographic).toBeInstanceOf(OrthographicCamera);
    expect(JSON.stringify(loadedOrthographic.toJSON())).toBe(
      JSON.stringify(orthographic.toJSON()),
    );
    expect(loadedOrthographic.projectionMatrix.elements).toEqual(
      orthographic.projectionMatrix.elements,
    );
  });
});
