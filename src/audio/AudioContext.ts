import type { AudioContextLike } from "./AudioTypes.ts";

let _context: AudioContextLike | undefined;

/** Returns the lazily-created global audio context, or `undefined` when unavailable. */
export function getAudioContext(): AudioContextLike | undefined {
  if (_context === undefined) {
    _context = createBrowserAudioContextInternal();
  }
  return _context;
}

/** Replaces the global audio context with a caller-supplied value. */
export function setAudioContext(value: AudioContextLike | undefined): void {
  _context = value;
}

function createBrowserAudioContextInternal(): AudioContextLike | undefined {
  const scope = globalThis as typeof globalThis & {
    webkitAudioContext?: new () => AudioContextLike;
  };
  const Constructor = globalThis.AudioContext ?? scope.webkitAudioContext;
  if (!Constructor) return;
  let context: AudioContextLike | undefined;
  try {
    context = new Constructor() as unknown as AudioContextLike;
  } catch {
    context = undefined;
  }
  return context;
}
