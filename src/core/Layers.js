export class Layers {
	#mask = 1;

	/**
	 * Current bitmask.
	 * @returns {number}
	 */
	get mask() {
		return this.#mask;
	}

	/**
	 * Set the mask to a single layer.
	 * @param {number} layer
	 * @returns {void}
	 */
	set(layer) {
		this.#mask = 1 << layer;
	}

	/**
	 * Enable a layer (add it to the mask).
	 * @param {number} layer
	 * @returns {void}
	 */
	enable(layer) {
		this.#mask |= 1 << layer;
	}

	/**
	 * Enable all 32 layers.
	 * @returns {void}
	 */
	enableAll() {
		this.#mask = 0xffffffff;
	}

	/**
	 * Toggle a layer on/off.
	 * @param {number} layer
	 * @returns {void}
	 */
	toggle(layer) {
		this.#mask ^= 1 << layer;
	}

	/**
	 * Disable a layer (remove it from the mask).
	 * @param {number} layer
	 * @returns {void}
	 */
	disable(layer) {
		this.#mask &= ~(1 << layer);
	}

	/**
	 * Disable all layers.
	 * @returns {void}
	 */
	disableAll() {
		this.#mask = 0;
	}

	/**
	 * Test whether this mask overlaps another Layers mask.
	 * @param {Layers} layers
	 * @returns {boolean}
	 */
	test(layers) {
		return (this.#mask & layers.mask) !== 0;
	}

	/**
	 * Test if a specific layer is enabled.
	 * @param {number} layer
	 * @returns {boolean}
	 */
	isEnabled(layer) {
		return (this.#mask & (1 << layer)) !== 0;
	}
}
