// three.js r186: physically based light units. The Lambert shader multiplies
// irradiance by BRDF_Lambert = diffuse / PI (shaders/ShaderChunk/common and
// lights_lambert_pars_fragment), for direct and ambient light alike.
import * as THREE from "three";

export function lights() {
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(0, 0, 1);
  const sky = new THREE.AmbientLight(0xffffff, 1);
  return { sun, sky };
}
