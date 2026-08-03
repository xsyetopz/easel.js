const rawBasePath = import.meta.env?.BASE_URL ?? "/";
const basePath = rawBasePath.endsWith("/") ? rawBasePath : `${rawBasePath}/`;

export function texturePath(name) {
  return `${basePath}textures/${name}`;
}
