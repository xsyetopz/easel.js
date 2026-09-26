// EASEL 0.7.0: load() returns void and loadAsync() resolves `unknown`.
// Images wider or taller than 128 are scaled down with drawImage.
import { LambertMaterial, Texture, TextureLoader } from "@xsyetopz/easel";

export function material(url: string): LambertMaterial {
  const result = new LambertMaterial();
  new TextureLoader().load(url, (texture) => {
    result.map = texture;
    result.needsUpdate = true;
  });
  return result;
}

export async function materialAsync(url: string): Promise<LambertMaterial> {
  const loaded = await new TextureLoader().loadAsync(url);
  if (!(loaded instanceof Texture)) throw new TypeError(`${url}: no texture`);
  return new LambertMaterial({ map: loaded });
}
