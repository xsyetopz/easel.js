/**
 * Face culling sides.
 * @enum {number}
 */
export const Side = Object.freeze({
	Front: 0,
	Back: 1,
	Double: 2,
});

/**
 * Shading models available in the scanline rasterizer.
 * @enum {number}
 */
export const Shading = Object.freeze({
	Flat: 0,
	Gouraud: 1,
});

/**
 * Draw order layers within a tile. Higher values draw later (on top).
 * @enum {number}
 */
export const Layer = Object.freeze({
	GROUND: 0,
	SCENERY: 1,
	ENTITY: 2,
	OVERLAY: 3,
});
