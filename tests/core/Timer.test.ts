import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { Timer } from "@/core/Timer.js";
import { Timer as THREETimer } from "three";

type TimerDocumentLike = {
  hidden: boolean;
  addEventListener: (
    type: "visibilitychange",
    listener: () => void,
  ) => void;
  removeEventListener: (
    type: "visibilitychange",
    listener: () => void,
  ) => void;
  dispatchVisibilityChange: () => void;
  listenerCount: () => number;
};

function makeDocumentLike(): TimerDocumentLike {
  const listeners = new Set<() => void>();

  return {
    hidden: false,
    addEventListener(type, listener) {
      if (type === "visibilitychange") listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === "visibilitychange") listeners.delete(listener);
    },
    dispatchVisibilityChange() {
      for (const listener of listeners) listener();
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

describe("Timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps reads observational until update is called", () => {
    const timer = new Timer();
    vi.advanceTimersByTime(100);
    expect(timer.delta).toBe(0);
    expect(timer.elapsedTime).toBe(0);
  });

  it("advances only through an explicit update", () => {
    const timer = new Timer();
    vi.advanceTimersByTime(100);
    expect(timer.update()).toBe(timer);
    expect(timer.delta).toBeCloseTo(0.1);
    expect(timer.elapsedTime).toBeCloseTo(0.1);
  });

  it("accepts a frame timestamp without sampling the clock again", () => {
    const timer = new Timer();
    timer.update(40);
    expect(timer.delta).toBeCloseTo(0.04);
    timer.update(65);
    expect(timer.delta).toBeCloseTo(0.025);
    expect(timer.elapsedTime).toBeCloseTo(0.065);
  });

  it("applies timeScale to subsequent deltas", () => {
    const timer = new Timer();
    timer.timeScale = 0.5;
    timer.update(100);
    expect(timer.delta).toBeCloseTo(0.05);
    expect(timer.elapsedTime).toBeCloseTo(0.05);
  });

  it("resets the delta baseline without changing elapsed time", () => {
    const timer = new Timer();
    timer.update(100);
    timer.reset(250);
    expect(timer.delta).toBe(0);
    expect(timer.elapsedTime).toBeCloseTo(0.1);
    timer.update(300);
    expect(timer.delta).toBeCloseTo(0.05);
  });

  it("registers visibility handling with the supplied document", () => {
    const documentLike = makeDocumentLike();
    const timer = new Timer();

    timer.connect(documentLike as unknown as Document);

    expect(documentLike.listenerCount()).toBe(1);
  });

  it("suppresses updates while the supplied document is hidden", () => {
    const documentLike = makeDocumentLike();
    const timer = new Timer();

    timer.connect(documentLike as unknown as Document);
    timer.update(100);
    documentLike.hidden = true;
    timer.update(200);

    expect(timer.delta).toBe(0);
    expect(timer.elapsedTime).toBeCloseTo(0.1);
  });

  it("resumes from a fresh visible baseline without losing elapsed time", () => {
    const documentLike = makeDocumentLike();
    const timer = new Timer();

    timer.start();
    timer.connect(documentLike as unknown as Document);
    timer.update(100);
    documentLike.hidden = true;
    timer.update(200);
    vi.advanceTimersByTime(150);
    documentLike.hidden = false;
    documentLike.dispatchVisibilityChange();
    timer.update(300);

    expect(timer.delta).toBeCloseTo(0.15);
    expect(timer.elapsedTime).toBeCloseTo(0.25);
    expect(timer.running).toBe(true);
  });

  it("removes the visibility listener on disconnect", () => {
    const documentLike = makeDocumentLike();
    const timer = new Timer();

    timer.connect(documentLike as unknown as Document);
    timer.disconnect();

    expect(documentLike.listenerCount()).toBe(0);
  });

  it("reconnects visibility handling from one document to another", () => {
    const firstDocument = makeDocumentLike();
    const secondDocument = makeDocumentLike();
    const timer = new Timer();

    timer.connect(firstDocument as unknown as Document);
    timer.connect(secondDocument as unknown as Document);
    timer.update(100);

    firstDocument.hidden = true;
    firstDocument.dispatchVisibilityChange();
    firstDocument.hidden = false;
    firstDocument.dispatchVisibilityChange();
    timer.update(200);

    expect(timer.delta).toBeCloseTo(0.1);

    vi.advanceTimersByTime(100);
    secondDocument.hidden = true;
    secondDocument.dispatchVisibilityChange();
    secondDocument.hidden = false;
    secondDocument.dispatchVisibilityChange();
    timer.update(300);

    expect(timer.delta).toBeCloseTo(0.2);
    expect(firstDocument.listenerCount()).toBe(0);
    expect(secondDocument.listenerCount()).toBe(1);
  });

  it("matches locked THREE.js Timer sampling semantics", () => {
    const timer = new Timer();
    const THREEInstance = new THREETimer();
    timer.timeScale = 0.75;
    THREEInstance.setTimescale(0.75);

    for (const timestamp of [16, 42, 100]) {
      timer.update(timestamp);
      THREEInstance.update(timestamp);
      expect(timer.delta).toBeCloseTo(THREEInstance.getDelta());
      expect(timer.elapsedTime).toBeCloseTo(THREEInstance.getElapsed());
    }
  });
});
