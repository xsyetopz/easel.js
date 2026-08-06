import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
  error,
  getConsoleFunction,
  log,
  setConsoleFunction,
  warn,
  warnOnce,
} from "@/index.ts";

const messages: string[] = [];

afterEach(() => {
  messages.length = 0;
  setConsoleFunction(null);
});

describe("log", () => {
  test("prefixes message with EASEL. and calls console.log", () => {
    const spy = spyOn(console, "log").mockImplementation((...args) => {
      messages.push(String(args[0]));
    });
    log("TestComponent", "info", 42);
    expect(messages[0]).toBe("EASEL.TestComponent");
    spy.mockRestore();
  });

  test("routes through custom console function when set", () => {
    const fn = mock((_type: string, message: string) => {
      messages.push(message);
    });
    setConsoleFunction(fn);
    log("MyClass", "detail");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(messages[0]).toBe("EASEL.MyClass");
  });
});

describe("warn", () => {
  test("prefixes message with EASEL. and calls console.warn", () => {
    const spy = spyOn(console, "warn").mockImplementation((...args) => {
      messages.push(String(args[0]));
    });
    warn("Deprecation", "use NewClass instead");
    expect(messages[0]).toBe("EASEL.Deprecation");
    spy.mockRestore();
  });
});

describe("error", () => {
  test("prefixes message with EASEL. and calls console.error", () => {
    const spy = spyOn(console, "error").mockImplementation((...args) => {
      messages.push(String(args[0]));
    });
    error("Fatal", "something broke");
    expect(messages[0]).toBe("EASEL.Fatal");
    spy.mockRestore();
  });
});

describe("warnOnce", () => {
  test("warns only once for the same first argument", () => {
    const spy = spyOn(console, "warn").mockImplementation(() => {});
    warnOnce("SameWarning", "first");
    warnOnce("SameWarning", "second");
    warnOnce("DifferentWarning", "third");
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe("getConsoleFunction / setConsoleFunction", () => {
  test("returns null by default and the function after setting", () => {
    expect(getConsoleFunction()).toBe(null);
    const fn = mock(() => {});
    setConsoleFunction(fn);
    expect(getConsoleFunction()).toBe(fn);
    setConsoleFunction(null);
    expect(getConsoleFunction()).toBe(null);
  });
});
