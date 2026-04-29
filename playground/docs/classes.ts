import { animationDocs } from "./classes/animation.ts";
import { animationAdditionalDocs } from "./classes/animation-additional.ts";
import { cameraDocs } from "./classes/cameras.ts";
import { constantDocs } from "./classes/constants.ts";
import { controlDocs } from "./classes/controls.ts";
import { coreDocs } from "./classes/core.ts";
import { curveDocs } from "./classes/curves.ts";
import { geometryDocs } from "./classes/geometry.ts";
import { geometryAdditionalDocs } from "./classes/geometry-additional.ts";
import { helperDocs } from "./classes/helpers.ts";
import { lightDocs } from "./classes/lights.ts";
import { loaderDocs } from "./classes/loaders.ts";
import { materialDocs } from "./classes/materials.ts";
import { mathDocs } from "./classes/math.ts";
import { objectDocs } from "./classes/objects.ts";
import { sceneDocs } from "./classes/scene.ts";
import { textureDocs } from "./classes/textures.ts";
import type { DocEntry } from "./types.ts";

export const docCategories = [
	"Core",
	"Cameras",
	"Geometry",
	"Materials",
	"Lights",
	"Objects",
	"Animation",
	"Textures",
	"Scene",
	"Controls",
	"Helpers",
	"Math",
	"Loaders",
	"Curves",
];

export const docClasses = [
	...coreDocs,
	...cameraDocs,
	...geometryDocs,
	...materialDocs,
	...lightDocs,
	...objectDocs,
	...animationDocs,
	...textureDocs,
	...sceneDocs,
	...controlDocs,
	...helperDocs,
	...mathDocs,
	...loaderDocs,
	...animationAdditionalDocs,
	...curveDocs,
	...geometryAdditionalDocs,
	...constantDocs,
] satisfies DocEntry[];
