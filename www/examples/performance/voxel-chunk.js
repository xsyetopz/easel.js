import * as EASEL from "@/index.js";

export const meta = {
	id: "voxel-chunk",
	name: "Voxel Chunk Workload",
	category: "performance",
	description: "Voxel chunks measuring geometry merging vs individual meshes.",
};

export const controls = [
	{
		type: "slider",
		key: "chunkSize",
		label: "Chunk Size",
		min: 2,
		max: 16,
		step: 1,
		default: 8,
	},
	{
		type: "select",
		key: "meshMode",
		label: "Mesh Mode",
		options: ["Individual Cubes", "Merged Geometry", "InstancedMesh"],
		default: "Individual Cubes",
	},
	{
		type: "select",
		key: "textured",
		label: "Textured",
		options: ["No", "Yes"],
		default: "No",
	},
	{
		type: "select",
		key: "hollowInterior",
		label: "Hollow Interior",
		options: ["No", "Yes"],
		default: "Yes",
	},
];

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} size
 * @returns {boolean}
 */
function isOnSurface(x, y, z, size) {
	return (
		x === 0 ||
		x === size - 1 ||
		y === 0 ||
		y === size - 1 ||
		z === 0 ||
		z === size - 1
	);
}

/**
 * @param {number} y
 * @param {number} size
 * @returns {number}
 */
function layerColor(y, size) {
	if (y === size - 1) return 0x44aa44;
	if (y > 0) return 0x886644;
	return 0x888888;
}

/**
 * @param {number} color
 * @returns {[number, number, number]}
 */
function colorToRgb(color) {
	return [
		((color >> 16) & 0xff) / 255,
		((color >> 8) & 0xff) / 255,
		(color & 0xff) / 255,
	];
}

function createVoxelTexture() {
	const size = 32;
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const isGrass = y < size / 2;
			data[i] = isGrass ? 68 : 136;
			data[i + 1] = isGrass ? 170 : 102;
			data[i + 2] = isGrass ? 68 : 68;
			data[i + 3] = 255;
		}
	}
	return new EASEL.DataTexture(data, size, size);
}

/** @type {readonly [number, number, number, number, number, number, number, number, number, number, number, number, number, number][]} */
const FACE_DEFS = [
	// +X: normal (1,0,0), 4 vertices at x+1 face
	// biome-ignore format: data table
	1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1,
	// -X: normal (-1,0,0), 4 vertices at x face
	// biome-ignore format: data table
	-1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0,
	// +Y: normal (0,1,0), 4 vertices at y+1 face
	// biome-ignore format: data table
	0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1,
	// -Y: normal (0,-1,0), 4 vertices at y face
	// biome-ignore format: data table
	0, -1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0,
	// +Z: normal (0,0,1), 4 vertices at z+1 face
	// biome-ignore format: data table
	0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
	// -Z: normal (0,0,-1), 4 vertices at z face
	// biome-ignore format: data table
	0, 0, -1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0,
];

/**
 * @param {number} size
 * @param {boolean} hollow
 * @returns {{ geometry: EASEL.Geometry, triCount: number }}
 */
function buildMergedGeometry(size, hollow) {
	const positions = [];
	const normals = [];
	const uvs = [];
	const colors = [];
	const indices = [];
	let vertexOffset = 0;

	const half = size / 2;

	/** @type {boolean[][][]} */
	const filled = [];
	for (let x = 0; x < size; x++) {
		filled[x] = [];
		for (let y = 0; y < size; y++) {
			filled[x][y] = [];
			for (let z = 0; z < size; z++) {
				filled[x][y][z] = !hollow || isOnSurface(x, y, z, size);
			}
		}
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {boolean}
	 */
	function hasVoxel(x, y, z) {
		if (x < 0 || x >= size || y < 0 || y >= size || z < 0 || z >= size) {
			return false;
		}
		return filled[x][y][z];
	}

	/** @type {[number, number, number][]} */
	const neighborDirs = [
		[1, 0, 0],
		[-1, 0, 0],
		[0, 1, 0],
		[0, -1, 0],
		[0, 0, 1],
		[0, 0, -1],
	];

	for (let x = 0; x < size; x++) {
		for (let y = 0; y < size; y++) {
			for (let z = 0; z < size; z++) {
				if (!filled[x][y][z]) continue;

				const [cr, cg, cb] = colorToRgb(layerColor(y, size));

				for (let f = 0; f < 6; f++) {
					const [dx, dy, dz] = neighborDirs[f];
					if (hasVoxel(x + dx, y + dy, z + dz)) continue;

					const faceRow = f * 15;
					const nx = FACE_DEFS[faceRow];
					const ny = FACE_DEFS[faceRow + 1];
					const nz = FACE_DEFS[faceRow + 2];

					for (let v = 0; v < 4; v++) {
						const vi = faceRow + 3 + v * 3;
						positions.push(
							FACE_DEFS[vi] + x - half,
							FACE_DEFS[vi + 1] + y - half,
							FACE_DEFS[vi + 2] + z - half,
						);
						normals.push(nx, ny, nz);
						colors.push(cr, cg, cb);
					}

					uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

					indices.push(
						vertexOffset,
						vertexOffset + 1,
						vertexOffset + 2,
						vertexOffset,
						vertexOffset + 2,
						vertexOffset + 3,
					);
					vertexOffset += 4;
				}
			}
		}
	}

	const geometry = new EASEL.Geometry();
	geometry.setPositions(positions);
	geometry.setNormals(normals);
	geometry.setUVs(uvs);
	geometry.setColors(colors);
	geometry.setIndex(indices);

	const triCount = Math.floor(indices.length / 3);
	return { geometry, triCount };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, unknown>} [params]
 */
export function setup(canvas, params = {}) {
	const width = canvas.width;
	const height = canvas.height;

	const scene = new EASEL.Scene();
	const camera = new EASEL.PerspectiveCamera({
		fov: 60,
		aspect: width / height,
		near: 0.1,
		far: 200,
	});

	const renderer = new EASEL.Renderer({ canvas, width, height });

	scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
	const light = new EASEL.DirectionalLight(0xffffff, 0.8);
	light.position.set(5, 10, 7);
	scene.add(light);

	let currentChunkSize = /** @type {number} */ (params.chunkSize ?? 8);
	let currentMeshMode = /** @type {string} */ (
		params.meshMode ?? "Individual Cubes"
	);
	let currentTextured = /** @type {string} */ (params.textured ?? "No");
	let currentHollow = /** @type {string} */ (params.hollowInterior ?? "Yes");

	const sharedBoxGeo = new EASEL.BoxGeometry(1, 1, 1);
	const voxelTexture = createVoxelTexture();

	/** @type {(EASEL.Mesh | EASEL.InstancedMesh)[]} */
	let meshes = [];
	let cubeCount = 0;
	let triCount = 0;

	/**
	 * @param {number} size
	 * @param {string} mode
	 * @param {string} textured
	 * @param {string} hollow
	 */
	function rebuild(size, mode, textured, hollow) {
		for (const m of meshes) scene.remove(m);
		meshes = [];
		cubeCount = 0;
		triCount = 0;

		const isHollow = hollow === "Yes";
		const isTextured = textured === "Yes";
		const half = size / 2;

		if (mode === "Individual Cubes") {
			for (let x = 0; x < size; x++) {
				for (let y = 0; y < size; y++) {
					for (let z = 0; z < size; z++) {
						if (isHollow && !isOnSurface(x, y, z, size)) continue;

						const color = layerColor(y, size);
						const mat = new EASEL.LambertMaterial({ color });
						if (isTextured) {
							mat.map = voxelTexture;
						}
						const mesh = new EASEL.Mesh(sharedBoxGeo, mat);
						mesh.position.set(x - half + 0.5, y - half + 0.5, z - half + 0.5);
						scene.add(mesh);
						meshes.push(mesh);
						cubeCount++;
					}
				}
			}
			triCount = cubeCount * 12;
		} else if (mode === "InstancedMesh") {
			/** @type {{ x: number, y: number, z: number, color: number }[]} */
			const voxels = [];
			for (let x = 0; x < size; x++) {
				for (let y = 0; y < size; y++) {
					for (let z = 0; z < size; z++) {
						if (isHollow && !isOnSurface(x, y, z, size)) continue;
						voxels.push({
							x: x - half + 0.5,
							y: y - half + 0.5,
							z: z - half + 0.5,
							color: layerColor(y, size),
						});
					}
				}
			}

			cubeCount = voxels.length;
			const mat = new EASEL.LambertMaterial({ color: 0xffffff });
			if (isTextured) {
				mat.map = voxelTexture;
			}
			const im = new EASEL.InstancedMesh(sharedBoxGeo, mat, cubeCount);
			const tmpMatrix = new EASEL.Matrix4();

			for (let idx = 0; idx < voxels.length; idx++) {
				const v = voxels[idx];
				tmpMatrix.makeTranslation(v.x, v.y, v.z);
				im.setMatrixAt(idx, tmpMatrix);
				const [cr, cg, cb] = colorToRgb(v.color);
				im.setColorAt(idx, { r: cr, g: cg, b: cb });
			}

			scene.add(im);
			meshes.push(im);
			triCount = cubeCount * 12;
		} else {
			const result = buildMergedGeometry(size, isHollow);
			const mat = new EASEL.LambertMaterial({ color: 0xffffff });
			if (isTextured) {
				mat.map = voxelTexture;
			}
			const mesh = new EASEL.Mesh(result.geometry, mat);
			scene.add(mesh);
			meshes.push(mesh);

			const idx = result.geometry.index;
			triCount = idx ? Math.floor(idx.length / 3) : 0;

			for (let x = 0; x < size; x++) {
				for (let y = 0; y < size; y++) {
					for (let z = 0; z < size; z++) {
						if (!isHollow || isOnSurface(x, y, z, size)) {
							cubeCount++;
						}
					}
				}
			}
		}
	}

	rebuild(currentChunkSize, currentMeshMode, currentTextured, currentHollow);

	const clock = new EASEL.Clock();
	let animId;
	let frames = 0;
	let fpsTime = 0;
	let fps = 0;
	let elapsed = 0;
	const ctx = canvas.getContext("2d");

	function animate() {
		animId = requestAnimationFrame(animate);
		const dt = clock.delta;
		elapsed += dt;

		const orbitRadius = currentChunkSize * 1.5;
		camera.position.x = Math.sin(elapsed * 0.4) * orbitRadius;
		camera.position.z = Math.cos(elapsed * 0.4) * orbitRadius;
		camera.position.y = orbitRadius * 0.6;
		camera.lookAt(new EASEL.Vector3(0, 0, 0));

		renderer.render(scene, camera);

		frames++;
		fpsTime += dt;
		if (fpsTime >= 1) {
			fps = Math.round(frames / fpsTime);
			frames = 0;
			fpsTime = 0;
		}

		if (ctx) {
			ctx.fillStyle = "#fff";
			ctx.font = "14px monospace";
			ctx.fillText(
				`FPS: ${fps}  Cubes: ${cubeCount}  Tris: ${triCount}  ${currentMeshMode}`,
				8,
				20,
			);
		}
	}
	animate();

	return {
		cleanup() {
			if (animId !== undefined) cancelAnimationFrame(animId);
		},
		update(newParams) {
			let needsRebuild = false;
			if (
				newParams.chunkSize !== undefined &&
				newParams.chunkSize !== currentChunkSize
			) {
				currentChunkSize = /** @type {number} */ (newParams.chunkSize);
				needsRebuild = true;
			}
			if (
				newParams.meshMode !== undefined &&
				newParams.meshMode !== currentMeshMode
			) {
				currentMeshMode = /** @type {string} */ (newParams.meshMode);
				needsRebuild = true;
			}
			if (
				newParams.textured !== undefined &&
				newParams.textured !== currentTextured
			) {
				currentTextured = /** @type {string} */ (newParams.textured);
				needsRebuild = true;
			}
			if (
				newParams.hollowInterior !== undefined &&
				newParams.hollowInterior !== currentHollow
			) {
				currentHollow = /** @type {string} */ (newParams.hollowInterior);
				needsRebuild = true;
			}
			if (needsRebuild) {
				rebuild(
					currentChunkSize,
					currentMeshMode,
					currentTextured,
					currentHollow,
				);
			}
		},
	};
}

export const easelSource = `import * as EASEL from "easel";

const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 60, aspect: width / height, near: 0.1, far: 200,
});
const renderer = new EASEL.Renderer({ canvas, width, height });
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));

const size = 8;
const half = size / 2;

const boxGeo = new EASEL.BoxGeometry(1, 1, 1);
for (let x = 0; x < size; x++) {
  for (let y = 0; y < size; y++) {
    for (let z = 0; z < size; z++) {
      if (x > 0 && x < size-1 && y > 0 && y < size-1
          && z > 0 && z < size-1) continue;
      const color = y === size-1 ? 0x44aa44
        : y > 0 ? 0x886644 : 0x888888;
      const mesh = new EASEL.Mesh(boxGeo,
        new EASEL.LambertMaterial({ color }));
      mesh.position.set(x - half + 0.5, y - half + 0.5, z - half + 0.5);
      scene.add(mesh);
    }
  }
}
`;

export const noThreeReason =
	"This workload measures EASEL static chunk mesh behavior and CPU raster cost.";

export const threeSource = undefined;
