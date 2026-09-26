import { DirectionalLight, LambertMaterial, type Mesh } from "@xsyetopz/easel";
import { check } from "../_lib/oracle.ts";
import * as candidate from "./candidate.ts";

// The three.js baseline needs a WebGL context, so only the EASEL side runs.
const C = "pbr-shadows";
const scene = candidate.build();
const mesh = scene.children.find((n) => n.type === "Mesh") as Mesh | undefined;
check(C, "Lambert replaces MeshStandardMaterial",
  mesh?.material instanceof LambertMaterial);
check(C, "directional light kept",
  scene.children.some((n) => n instanceof DirectionalLight));
const lambert = new LambertMaterial();
check(C, "LambertMaterial has no specular or shininess",
  !("specular" in lambert) && !("shininess" in lambert));
check(C, "no shadow fields exist on EASEL nodes",
  !("castShadow" in (mesh ?? {})) && !("shadow" in new DirectionalLight()));
