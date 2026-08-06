/** Console output type used by the custom console function. */
export type ConsoleType = "log" | "warn" | "error";

/** Custom console handler invoked for each EASEL log, warn, or error call. */
export type ConsoleFunction = (
  type: ConsoleType,
  message: string,
  ...params: unknown[]
) => void;

let _consoleFunction: ConsoleFunction | null = null;
const _warnedOnce = new Set<string>();

/** Replaces the default console handler with a custom function. */
export function setConsoleFunction(fn: ConsoleFunction | null): void {
  _consoleFunction = fn;
}

/** Returns the currently registered custom console function, or `null`. */
export function getConsoleFunction(): ConsoleFunction | null {
  return _consoleFunction;
}

/** Logs an informational message prefixed with `EASEL.`. */
export function log(...params: unknown[]): void {
  const message = `EASEL.${params.shift()}`;
  if (_consoleFunction) {
    _consoleFunction("log", message, ...params);
  } else {
    console.log(message, ...params);
  }
}

/** Logs a warning message prefixed with `EASEL.`. */
export function warn(...params: unknown[]): void {
  const message = `EASEL.${params.shift()}`;
  if (_consoleFunction) {
    _consoleFunction("warn", message, ...params);
  } else {
    console.warn(message, ...params);
  }
}

/** Logs an error message prefixed with `EASEL.`. */
export function error(...params: unknown[]): void {
  const message = `EASEL.${params.shift()}`;
  if (_consoleFunction) {
    _consoleFunction("error", message, ...params);
  } else {
    console.error(message, ...params);
  }
}

/** Logs a warning message only once for a given set of arguments. */
export function warnOnce(...params: unknown[]): void {
  const key = String(params[0] ?? "");
  if (_warnedOnce.has(key)) return;
  _warnedOnce.add(key);
  warn(...params);
}
