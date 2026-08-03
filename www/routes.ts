import { landingPagesBySlug } from "./content/landingPages.ts";

export type AppRoute =
  | { page: "home" }
  | { page: "examples" }
  | { page: "example"; param: string }
  | { page: "landing"; slug: string };

const LEGACY_HASH_PREFIX = /^#\/?/;

function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, "");
}

function parsePathSegments(path: string) {
  return normalizePath(path).split("/").filter(Boolean);
}

function parseSegments(segments: string[]): AppRoute {
  if (segments.length === 0) return { page: "home" };

  if (segments[0] === "examples") {
    if (segments[1]) return { page: "example", param: segments[1] };
    return { page: "examples" };
  }

  const slug = segments.join("/");
  if (landingPagesBySlug[slug]) {
    return { page: "landing", slug };
  }

  return { page: "home" };
}

export function parseRoutePath(path: string): AppRoute {
  return parseSegments(parsePathSegments(path));
}

export function parseLegacyHash(hash: string) {
  const path = hash.replace(LEGACY_HASH_PREFIX, "");
  if (!path) return null;
  return parseRoutePath(path);
}

export function parseCurrentRoute() {
  if (typeof window === "undefined") return { page: "home" } as AppRoute;

  const legacyRoute =
    window.location.pathname === "/"
      ? parseLegacyHash(window.location.hash)
      : null;

  return legacyRoute ?? parseRoutePath(window.location.pathname);
}

export function routeToPath(route: AppRoute | string) {
  if (typeof route === "string") {
    const normalized = normalizePath(route);
    return normalized ? `/${normalized}` : "/";
  }

  switch (route.page) {
    case "home":
      return "/";
    case "examples":
      return "/examples";
    case "example":
      return `/examples/${route.param}`;
    case "landing":
      return `/${route.slug}`;
    default:
      return "/";
  }
}

export function upgradeLegacyHashRoute() {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/" || !window.location.hash) return false;

  const legacyRoute = parseLegacyHash(window.location.hash);
  if (!legacyRoute) return false;

  window.history.replaceState({}, "", routeToPath(legacyRoute));
  return true;
}
