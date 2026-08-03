interface ParsedPath {
  nodeName: string | undefined;
  propertyName: string;
  propertyIndex: string | undefined;
}

/** Resolves a dotted property path on a root Node and provides get/set access. */
export class Binding {
  #root: object;
  #path: string;
  #parsedPath: ParsedPath;

  constructor(root: object, path: string) {
    this.#root = root;
    this.#path = path;
    this.#parsedPath = this.#parse(path);
  }

  get root(): object {
    return this.#root;
  }

  get path(): string {
    return this.#path;
  }

  /** Returns the node referenced by nodeName, or root if no nodeName. */
  resolveNode(): object | undefined {
    const { nodeName } = this.#parsedPath;
    if (!nodeName) return this.#root;
    return this.#findByName(this.#root, nodeName);
  }

  /** Reads current property value into targetArray at offset. */
  getValue(targetArray: number[] | Float64Array, offset: number): void {
    const node = this.resolveNode();
    if (!node) return;
    const { propertyName, propertyIndex } = this.#parsedPath;
    const nodeRec = node as Record<string, unknown>;
    const prop = nodeRec[propertyName];
    if (prop === undefined) return;

    if (propertyIndex !== undefined) {
      const propRec = prop as Record<string, unknown>;
      targetArray[offset] = (propRec[propertyIndex] as number) ?? 0;
    } else if (typeof prop === "number") {
      targetArray[offset] = prop;
    } else {
      const propRec = prop as Record<string, unknown>;
      let i = offset;
      for (const key of ["x", "y", "z", "w"]) {
        if (propRec[key] !== undefined) {
          targetArray[i++] = propRec[key] as number;
        }
      }
    }
  }

  /** Writes value from sourceArray at offset into the resolved property. */
  setValue(sourceArray: number[], offset: number): void {
    const node = this.resolveNode();
    if (!node) return;
    const { propertyName, propertyIndex } = this.#parsedPath;
    const nodeRec = node as Record<string, unknown>;
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

  /** Sets a property by index. */
  #setPropertyIndex(
    nodeRec: Record<string, unknown>,
    propertyName: string,
    prop: unknown,
    propertyIndex: string,
    sourceArray: number[],
    offset: number,
  ): void {
    if (prop === undefined) {
      nodeRec[propertyName] = sourceArray[offset];
    } else {
      const propRec = prop as Record<string, unknown>;
      propRec[propertyIndex] = sourceArray[offset];
    }
  }

  /** Sets vector/color property components. */
  #setVectorProperty(
    prop: unknown,
    sourceArray: number[],
    offset: number,
  ): void {
    const propRec = prop as Record<string, unknown>;
    const vecKeys = ["x", "y", "z", "w", "r", "g", "b"];
    let i = 0;
    for (const key of vecKeys) {
      if (key in propRec) {
        propRec[key] = sourceArray[offset + i++];
      }
    }
  }

  /** Parses a dotted path into { nodeName, propertyName, propertyIndex }. */
  #parse(path: string): ParsedPath {
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

  /** Depth-first search for a child node by name. */
  #findByName(node: object, name: string): object | undefined {
    const nodeRec = node as Record<string, unknown>;
    if (nodeRec["name"] === name) return node;
    if (Array.isArray(nodeRec["children"])) {
      for (const child of nodeRec["children"] as object[]) {
        const found = this.#findByName(child, name);
        if (found) return found;
      }
    }
    return void 0 as object | undefined;
  }
}
