const { BASE_URL = "/" } = import.meta.env as Record<
  string,
  string | undefined
>;
const basePath = BASE_URL.replace(/\/+$/u, "");

export function sitePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

export function sitePathname(pathname: string): string {
  if (
    !basePath ||
    (pathname !== basePath && !pathname.startsWith(`${basePath}/`))
  ) {
    return pathname;
  }

  return pathname.slice(basePath.length) || "/";
}
