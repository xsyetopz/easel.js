import { describe, expect, it } from "bun:test";
import { Node } from "@/core/Node.js";
import { AmbientLight } from "@/lights/AmbientLight.js";
import { DirectionalLight } from "@/lights/DirectionalLight.js";
import { HemisphereLight } from "@/lights/HemisphereLight.js";
import { Light } from "@/lights/Light.js";
import { PointLight } from "@/lights/PointLight.js";
import { SpotLight } from "@/lights/SpotLight.js";
import { Vector3 } from "@/math/Vector3.js";

describe("light family", () => {
  it("clones every concrete light as its concrete subtype", () => {
    const ambient = new AmbientLight(0x123456, 2);
    const directional = new DirectionalLight(0x234567, 3);
    const hemisphere = new HemisphereLight(0x345678, 0x456789, 4);
    const point = new PointLight(0x56789a, 5, 6, 7);
    const spot = new SpotLight(0x6789ab, 8, 9, 0.4, 0.25, 10);
    spot.direction.set(1, 2, 3);

    const target = new Node();
    directional.target = target;
    spot.target = target;

    const ambientClone = ambient.clone();
    const directionalClone = directional.clone();
    const hemisphereClone = hemisphere.clone();
    const pointClone = point.clone();
    const spotClone = spot.clone();

    expect(ambientClone).toBeInstanceOf(AmbientLight);
    expect(directionalClone).toBeInstanceOf(DirectionalLight);
    expect(hemisphereClone).toBeInstanceOf(HemisphereLight);
    expect(pointClone).toBeInstanceOf(PointLight);
    expect(spotClone).toBeInstanceOf(SpotLight);
    expect(ambientClone.type).toBe("AmbientLight");
    expect(directionalClone.type).toBe("DirectionalLight");
    expect(hemisphereClone.type).toBe("HemisphereLight");
    expect(pointClone.type).toBe("PointLight");
    expect(spotClone.type).toBe("SpotLight");

    expect(ambientClone.color).not.toBe(ambient.color);
    expect(ambientClone.color.hex).toBe(ambient.color.hex);
    expect(directionalClone.target).toBe(target);
    expect(hemisphereClone.groundColor).not.toBe(hemisphere.groundColor);
    expect(hemisphereClone.groundColor.hex).toBe(hemisphere.groundColor.hex);
    expect(pointClone.distance).toBe(point.distance);
    expect(pointClone.decay).toBe(point.decay);
    expect(spotClone.direction).not.toBe(spot.direction);
    expect(spotClone.direction).toEqual(spot.direction);
    expect(spotClone.target).toBe(target);
    expect(spotClone.distance).toBe(spot.distance);
    expect(spotClone.angle).toBe(spot.angle);
    expect(spotClone.penumbra).toBe(spot.penumbra);
    expect(spotClone.decay).toBe(spot.decay);

    ambientClone.color.set(0);
    hemisphereClone.groundColor.set(0);
    spotClone.direction.set(0, 0, 0);
    expect(ambient.color.hex).toBe(0x123456);
    expect(hemisphere.groundColor.hex).toBe(0x456789);
    expect(spot.direction.equals(new Vector3(1, 2, 3))).toBe(true);
  });

  it("keeps the base Light clone as a base Light", () => {
    const light = new Light(0x112233, 2);
    const clone = light.clone();

    expect(clone).toBeInstanceOf(Light);
    expect(clone.constructor).toBe(Light);
    expect(clone.type).toBe("Light");
    expect(clone.color.hex).toBe(0x112233);
    expect(clone.intensity).toBe(2);
  });

  it("serializes canonical light values without THREE metadata or target refs", () => {
    const ambient = new AmbientLight(0x123456, 2);
    const directional = new DirectionalLight(0x234567, 3);
    directional.target = new Node();
    const hemisphere = new HemisphereLight(0x345678, 0x456789, 4);
    const point = new PointLight(0x56789a, 5, 6, 7);
    const spot = new SpotLight(0x6789ab, 8, 9, 0.4, 0.25, 10);
    spot.target = new Node();

    expect(ambient.toJSON()).toMatchObject({
      type: "AmbientLight",
      color: 0x123456,
      intensity: 2,
    });
    expect(directional.toJSON()).toMatchObject({
      type: "DirectionalLight",
      color: 0x234567,
      intensity: 3,
    });
    expect(hemisphere.toJSON()).toMatchObject({
      type: "HemisphereLight",
      color: 0x345678,
      groundColor: 0x456789,
      intensity: 4,
    });
    expect(point.toJSON()).toMatchObject({
      type: "PointLight",
      color: 0x56789a,
      intensity: 5,
      distance: 6,
      decay: 7,
    });
    expect(spot.toJSON()).toMatchObject({
      type: "SpotLight",
      color: 0x6789ab,
      intensity: 8,
      distance: 9,
      angle: 0.4,
      penumbra: 0.25,
      decay: 10,
    });

    for (const json of [
      directional.toJSON(),
      spot.toJSON(),
      ambient.toJSON(),
    ]) {
      expect(json).not.toHaveProperty("metadata");
      expect(json).not.toHaveProperty("object");
      expect(json).not.toHaveProperty("target");
    }
  });

  it("provides explicit power accessors for point and spot lights", () => {
    const point = new PointLight(0xffffff, 2);
    const spot = new SpotLight(0xffffff, 3);

    expect(point.power).toBeCloseTo(8 * Math.PI);
    expect(spot.power).toBeCloseTo(3 * Math.PI);

    point.power = 4 * Math.PI;
    spot.power = 2 * Math.PI;
    expect(point.intensity).toBeCloseTo(1);
    expect(spot.intensity).toBeCloseTo(2);
  });

  it("rejects non-finite power values without changing intensity", () => {
    const point = new PointLight(0xffffff, 2);
    const spot = new SpotLight(0xffffff, 3);

    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => {
        point.power = value;
      }).toThrow("finite");
      expect(() => {
        spot.power = value;
      }).toThrow("finite");
      expect(point.intensity).toBe(2);
      expect(spot.intensity).toBe(3);
    }
  });

  it("rejects non-finite values from every light JSON path", () => {
    const light = new Light();
    const ambient = new AmbientLight();
    const directional = new DirectionalLight();
    const hemisphere = new HemisphereLight();
    const point = new PointLight();
    const spot = new SpotLight();
    const cases: Array<{ light: Light; mutate: () => void }> = [
      {
        light,
        mutate: () => {
          light.intensity = Number.NaN;
        },
      },
      {
        light: ambient,
        mutate: () => {
          ambient.color.r = Number.POSITIVE_INFINITY;
        },
      },
      {
        light: directional,
        mutate: () => {
          directional.position.x = Number.NaN;
        },
      },
      {
        light: hemisphere,
        mutate: () => {
          hemisphere.groundColor.g = Number.NaN;
        },
      },
      {
        light: point,
        mutate: () => {
          point.distance = Number.POSITIVE_INFINITY;
        },
      },
      {
        light: spot,
        mutate: () => {
          spot.angle = Number.NaN;
        },
      },
    ];

    for (const { light, mutate } of cases) {
      mutate();
      expect(() => light.toJSON()).toThrow("finite");
    }
  });

  it("rejects non-finite node and user-data state before JSON null coercion", () => {
    const light = new AmbientLight();
    light.userData = { nested: { value: Number.NaN } };
    expect(() => light.toJSON()).toThrow("finite");

    light.userData = {};
    light.position.y = Number.POSITIVE_INFINITY;
    expect(() => light.toJSON()).toThrow("finite");

    const mutating = new AmbientLight();
    mutating.userData = {
      custom: {
        toJSON: () => {
          mutating.color.r = Number.NaN;
          return 1;
        },
      },
    };
    expect(() => mutating.toJSON()).toThrow("finite");
  });
});
