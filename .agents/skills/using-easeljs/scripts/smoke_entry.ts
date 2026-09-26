#!/usr/bin/env bun
/**
 * Smoke-runs a browser entry module (a starter template's src/main.ts or a
 * bundled dist/main.js) under Bun with a stub DOM: document.querySelector
 * returns a stub #scene canvas, requestAnimationFrame is stepped manually,
 * and window "pagehide" listeners run at the end.
 *
 * usage: bun scripts/smoke_entry.ts ENTRY [WIDTH HEIGHT]
 * Passes when two frames upload visible pixels and pagehide cancels the
 * frame loop. Exit status: 0 pass, 1 check failed, 2 bad usage.
 * This is not a browser run; it proves the entry's EASEL calls execute.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  countDrawnPixels,
  createStubCanvas,
  installFrameScheduler,
} from "../assets/examples/harness.ts";

const [entry, width = "320", height = "180"] = process.argv.slice(2);
if (!entry || !existsSync(entry)) {
  console.error("usage: bun scripts/smoke_entry.ts ENTRY [WIDTH HEIGHT]");
  process.exit(2);
}

const stub = createStubCanvas(Number(width), Number(height));
const windowListeners = new Map<string, (() => void)[]>();
const scheduler = installFrameScheduler();
Object.assign(globalThis, {
  document: {
    querySelector: (selector: string) =>
      selector === "#scene" ? stub.element : null,
  },
  window: {
    addEventListener(type: string, listener: () => void) {
      windowListeners.set(type, [
        ...(windowListeners.get(type) ?? []),
        listener,
      ]);
    },
  },
});

await import(resolve(entry));
scheduler.step(16);
scheduler.step(32);
const pixels = countDrawnPixels(stub.frame);
const pendingBefore = scheduler.pending;
for (const listener of windowListeners.get("pagehide") ?? []) listener();
const pendingAfter = scheduler.pending;

const ok = pixels > 0 && pendingBefore === 1 && pendingAfter === 0;
console.log(
  `${ok ? "PASS" : "FAIL"} smoke ${entry}: drawn=${pixels}px ` +
    `queued-frames=${pendingBefore} after-pagehide=${pendingAfter}`,
);
process.exit(ok ? 0 : 1);
