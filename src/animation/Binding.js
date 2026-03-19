/**
 * Resolves a dotted property path on a root Node and provides get/set access.
 */
export class Binding {
	/** @type {object} */
	#root;

	/** @type {string} */
	#path;

	/** @type {{ nodeName: string|undefined, propertyName: string, propertyIndex: string|undefined }} */
	#parsedPath;

	/**
	 * @param {object} root - Root Node
	 * @param {string} path - Dotted property path, e.g. "position.x" or "child.position"
	 */
	constructor(root, path) {
		this.#root = root;
		this.#path = path;
		this.#parsedPath = this.#parse(path);
	}

	/** @returns {object} */
	get root() {
		return this.#root;
	}

	/** @returns {string} */
	get path() {
		return this.#path;
	}

	/**
	 * Returns the node referenced by nodeName, or root if no nodeName.
	 * @returns {object|undefined}
	 */
	resolveNode() {
		const { nodeName } = this.#parsedPath;
		if (!nodeName) return this.#root;
		return this.#findByName(this.#root, nodeName);
	}

	/**
	 * Reads current property value into targetArray at offset.
	 * @param {number[] | Float64Array} targetArray
	 * @param {number} offset
	 */
	getValue(targetArray, offset) {
		const node = this.resolveNode();
		if (!node) return;
		const { propertyName, propertyIndex } = this.#parsedPath;
		/** @type {Record<string, unknown>} */
		const nodeRec = /** @type {Record<string, unknown>} */ (node);
		const prop = nodeRec[propertyName];
		if (prop === undefined || prop === undefined) return;

		if (propertyIndex !== undefined) {
			/** @type {Record<string, unknown>} */
			const propRec = /** @type {Record<string, unknown>} */ (prop);
			targetArray[offset] = /** @type {number} */ (propRec[propertyIndex] ?? 0);
		} else if (typeof prop === "number") {
			targetArray[offset] = prop;
		} else {
			/** @type {Record<string, unknown>} */
			const propRec = /** @type {Record<string, unknown>} */ (prop);
			let i = offset;
			for (const key of ["x", "y", "z", "w"]) {
				if (propRec[key] !== undefined) {
					targetArray[i++] = /** @type {number} */ (propRec[key]);
				}
			}
		}
	}

	/**
	 * Writes value from sourceArray at offset into the resolved property.
	 * @param {number[]} sourceArray
	 * @param {number} offset
	 */
	setValue(sourceArray, offset) {
		const node = this.resolveNode();
		if (!node) return;
		const { propertyName, propertyIndex } = this.#parsedPath;
		/** @type {Record<string, unknown>} */
		const nodeRec = /** @type {Record<string, unknown>} */ (node);
		const prop = nodeRec[propertyName];
		if (prop === undefined && propertyIndex === undefined) return;

		if (propertyIndex !== undefined) {
			this.#setPropertyIndex(
				nodeRec,
				propertyName,
				prop,
				propertyIndex,
				sourceArray,
				offset,
			);
		} else if (typeof nodeRec[propertyName] === "number") {
			nodeRec[propertyName] = sourceArray[offset];
		} else if (prop !== undefined) {
			this.#setVectorProperty(prop, sourceArray, offset);
		}
	}

	/**
	 * Sets a property by index.
	 * @param {Record<string, unknown>} nodeRec
	 * @param {string} propertyName
	 * @param {unknown} prop
	 * @param {string} propertyIndex
	 * @param {number[]} sourceArray
	 * @param {number} offset
	 */
	#setPropertyIndex(
		nodeRec,
		propertyName,
		prop,
		propertyIndex,
		sourceArray,
		offset,
	) {
		if (prop === undefined) {
			nodeRec[propertyName] = sourceArray[offset];
		} else {
			/** @type {Record<string, unknown>} */
			const propRec = /** @type {Record<string, unknown>} */ (prop);
			propRec[propertyIndex] = sourceArray[offset];
		}
	}

	/**
	 * Sets vector/color property components.
	 * @param {unknown} prop
	 * @param {number[]} sourceArray
	 * @param {number} offset
	 */
	#setVectorProperty(prop, sourceArray, offset) {
		/** @type {Record<string, unknown>} */
		const propRec = /** @type {Record<string, unknown>} */ (prop);
		const vecKeys = ["x", "y", "z", "w", "r", "g", "b"];
		let i = 0;
		for (const key of vecKeys) {
			if (key in propRec) {
				propRec[key] = sourceArray[offset + i++];
			}
		}
	}

	/**
	 * Parses a dotted path into { nodeName, propertyName, propertyIndex }.
	 * @param {string} path
	 * @returns {{ nodeName: string|undefined, propertyName: string, propertyIndex: string|undefined }}
	 */
	#parse(path) {
		const parts = path.split(".");
		const indices = new Set(["x", "y", "z", "w", "r", "g", "b"]);

		if (parts.length === 1) {
			return {
				nodeName: undefined,
				propertyName: parts[0],
				propertyIndex: undefined,
			};
		}

		const last = parts[parts.length - 1];
		if (indices.has(last)) {
			const propName = parts[parts.length - 2];
			const nodeName =
				parts.length > 2 ? parts.slice(0, -2).join(".") : undefined;
			return { nodeName, propertyName: propName, propertyIndex: last };
		}

		const propName = last;
		const nodeName =
			parts.length > 1 ? parts.slice(0, -1).join(".") : undefined;
		return { nodeName, propertyName: propName, propertyIndex: undefined };
	}

	/**
	 * Depth-first search for a child node by name.
	 * @param {object} node
	 * @param {string} name
	 * @returns {object|undefined}
	 */
	#findByName(node, name) {
		/** @type {Record<string, unknown>} */
		const nodeRec = /** @type {Record<string, unknown>} */ (node);
		if (nodeRec["name"] === name) return node;
		if (Array.isArray(nodeRec["children"])) {
			for (const child of /** @type {object[]} */ (nodeRec["children"])) {
				const found = this.#findByName(child, name);
				if (found) return found;
			}
		}
		return undefined;
	}
}
