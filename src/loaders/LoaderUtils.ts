/** Returns the directory portion of a resource URL, including its trailing slash. */
export function extractUrlBase(url: string): string {
  const separator = url.lastIndexOf("/");
  return separator === -1 ? "./" : url.slice(0, separator + 1);
}

/** Resolves an asset URL against a path while preserving absolute URLs. */
export function resolveUrl(url: string, path: string): string {
  if (url === "") return "";
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//iu.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/iu.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/iu.test(path)) return new URL(url, path).href;
  return path + url;
}
