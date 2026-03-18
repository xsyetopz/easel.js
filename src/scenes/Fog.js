/**
 * Hard tile-count fog cutoff. Beyond this radius the framebuffer is black.
 * No color, no gradient.
 */
export class Fog {
	/** @type {number} */
	#tiles;

	/**
	 * @param {{ tiles: number }} options
	 */
	constructor({ tiles }) {
		this.#tiles = tiles;
	}

	/**
	 * Tile-count cutoff radius.
	 * @returns {number}
	 */
	get tiles() {
		return this.#tiles;
	}

	/** @param {number} value */
	set tiles(value) {
		this.#tiles = value;
	}

	/**
	 * @returns {Fog}
	 */
	clone() {
		return new Fog({ tiles: this.#tiles });
	}
}
