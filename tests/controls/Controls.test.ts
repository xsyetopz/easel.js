import { describe, expect, it, vi } from "bun:test";
import { Controls } from "@/controls/Controls.js";
import { EventDispatcher } from "@/core/EventDispatcher.js";
import { Node } from "@/core/Node.js";

describe("Controls", () => {
  describe("constructor", () => {
    it("stores the object and domElement", () => {
      const object = new Node();
      const dom = new EventTarget();
      const controls = new Controls(object, dom);

      expect(controls.object).toBe(object);
      expect(controls.domElement).toBe(dom);
    });

    it("defaults domElement to undefined when omitted", () => {
      const controls = new Controls(new Node());

      expect(controls.domElement).toBeUndefined();
    });

    it("defaults enabled to true", () => {
      const controls = new Controls(new Node());

      expect(controls.enabled).toBe(true);
    });
  });

  describe("inheritance", () => {
    it("extends EventDispatcher", () => {
      const controls = new Controls(new Node());

      expect(controls).toBeInstanceOf(EventDispatcher);
      expect(controls).toBeInstanceOf(Controls);
    });

    it("supports addEventListener / dispatchEvent from EventDispatcher", () => {
      const controls = new Controls(new Node());
      const listener = vi.fn();

      controls.addEventListener("change", listener);
      controls.dispatchEvent({ type: "change" });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ type: "change" });
    });
  });

  describe("connect", () => {
    it("sets domElement when not already connected", () => {
      const controls = new Controls(new Node());
      const dom = new EventTarget();

      controls.connect(dom);

      expect(controls.domElement).toBe(dom);
    });

    it("replaces the existing domElement on reconnect", () => {
      const dom1 = new EventTarget();
      const dom2 = new EventTarget();
      const controls = new Controls(new Node(), dom1);

      controls.connect(dom2);

      expect(controls.domElement).toBe(dom2);
    });

    it("calls disconnect before switching to a new element", () => {
      const dom1 = new EventTarget();
      const dom2 = new EventTarget();
      const controls = new Controls(new Node(), dom1);
      const spy = vi.spyOn(controls, "disconnect");

      controls.connect(dom2);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("disconnect / dispose / update", () => {
    it("provides no-op stubs that do not throw", () => {
      const controls = new Controls(new Node());

      expect(() => controls.disconnect()).not.toThrow();
      expect(() => controls.dispose()).not.toThrow();
      expect(() => controls.update()).not.toThrow();
      expect(() => controls.update(0.016)).not.toThrow();
    });
  });

  describe("enabled", () => {
    it("can be set to false", () => {
      const controls = new Controls(new Node());
      controls.enabled = false;

      expect(controls.enabled).toBe(false);
    });
  });
});
