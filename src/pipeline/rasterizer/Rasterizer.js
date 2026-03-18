import { MathUtils } from "../../math/MathUtils.js";
import { ColorTable } from "../color/ColorTable.js";
import { TextureSampler } from "../texture/TextureSampler.js";
import { PointRasterizer } from "./PointRasterizer.js";
import { ScanlineFill } from "./ScanlineFill.js";
import { WireframeRasterizer } from "./WireframeRasterizer.js";

export class Rasterizer {
	#scanlineFill = new ScanlineFill();
	#wireframe = new WireframeRasterizer();
	#point = new PointRasterizer();
	#colorTable = new ColorTable();
	#textureSampler = new TextureSampler();

	/**
	 * Rasterizes a draw call to the framebuffer by dispatching to the appropriate
	 * sub-rasterizer based on the material mode.
	 * @param {{
	 *   triangles: Array<{
	 *     screenVerts: Array<{ x: number, y: number }>,
	 *     uvs?: Array<{ u: number, v: number }>
	 *   }>,
	 *   material: {
	 *     wireframe?: boolean,
	 *     points?: boolean,
	 *     pointRadius?: number,
	 *     color?: { r: number, g: number, b: number },
	 *     map?: { data: { data: Uint8ClampedArray, width: number, height: number } }
	 *   },
	 *   shadedColors?: Array<number | number[]>
	 * }} drawCall
	 * @param {{ width: number, height: number }} framebuffer
	 * @param {unknown} _colorTable Ignored — internal ColorTable is used
	 * @param {(x: number, y: number, r: number, g: number, b: number, a: number) => void} pixelWriter
	 * @returns {void}
	 */
	rasterize(drawCall, framebuffer, _colorTable, pixelWriter) {
		const { width, height } = framebuffer;
		const { wireframe, points, pointRadius = 2 } = drawCall.material;

		const matColor = drawCall.material.color;
		const baseR = matColor ? Math.round(matColor.r * 255) : 255;
		const baseG = matColor ? Math.round(matColor.g * 255) : 255;
		const baseB = matColor ? Math.round(matColor.b * 255) : 255;

		const texture = drawCall.material.map?.data ?? undefined;

		for (let i = 0; i < drawCall.triangles.length; i++) {
			const tri = drawCall.triangles[i];
			const [a, b, c] = tri.screenVerts;
			const x1 = a.x | 0;
			const y1 = a.y | 0;
			const x2 = b.x | 0;
			const y2 = b.y | 0;
			const x3 = c.x | 0;
			const y3 = c.y | 0;

			const sc = drawCall.shadedColors?.[i];
			const isFlat = sc !== undefined && typeof sc === "number";
			const isGouraud = sc !== undefined && Array.isArray(sc);

			// Flat shading: single HSL16 → one RGB for the whole triangle.
			let flatR = baseR;
			let flatG = baseG;
			let flatB = baseB;
			if (isFlat) {
				const lit = this.#colorTable.lookup(/** @type {number} */ (sc));
				flatR = Math.round((baseR * lit.r) / 255);
				flatG = Math.round((baseG * lit.g) / 255);
				flatB = Math.round((baseB * lit.b) / 255);
			}

			/** @type {(px: number, py: number, bu: number, bv: number, bw: number) => void} */
			const colorCb = (px, py, bu, bv, bw) => {
				let r = flatR;
				let g = flatG;
				let bl = flatB;

				if (isGouraud) {
					[r, g, bl] = this.#resolveGouraud(
						/** @type {number[]} */ (sc),
						bu,
						bv,
						bw,
						baseR,
						baseG,
						baseB,
					);
				}

				if (texture) {
					[r, g, bl] = this.#applyTexture(
						texture,
						tri.uvs,
						bu,
						bv,
						bw,
						r,
						g,
						bl,
						isFlat || isGouraud,
						baseR,
						baseG,
						baseB,
					);
				}

				pixelWriter(px, py, r, g, bl, 255);
			};

			if (wireframe) {
				this.#wireframe.rasterize(x1, y1, x2, y2, x3, y3, (px, py) =>
					pixelWriter(px, py, flatR, flatG, flatB, 255),
				);
			} else if (points) {
				const ptCb = (/** @type {number} */ px, /** @type {number} */ py) =>
					pixelWriter(px, py, flatR, flatG, flatB, 255);
				this.#point.rasterize(x1, y1, pointRadius, width, height, ptCb);
				this.#point.rasterize(x2, y2, pointRadius, width, height, ptCb);
				this.#point.rasterize(x3, y3, pointRadius, width, height, ptCb);
			} else {
				this.#scanlineFill.fill(x1, y1, x2, y2, x3, y3, width, height, colorCb);
			}
		}
	}

	/**
	 * Interpolates three Gouraud float-lightness vertex values using barycentric
	 * weights and modulates by the material base color.
	 * @param {number[]} colors Three raw float lightness values in [0, 1]
	 * @param {number} bu Barycentric weight for vertex 0
	 * @param {number} bv Barycentric weight for vertex 1
	 * @param {number} bw Barycentric weight for vertex 2
	 * @param {number} baseR Material red channel [0, 255]
	 * @param {number} baseG Material green channel [0, 255]
	 * @param {number} baseB Material blue channel [0, 255]
	 * @returns {[number, number, number]} Final [r, g, b] in [0, 255]
	 */
	#resolveGouraud(colors, bu, bv, bw, baseR, baseG, baseB) {
		const l = colors[0] * bu + colors[1] * bv + colors[2] * bw;
		const brightness = Math.round(MathUtils.clamp(l, 0, 1) * 255);
		return [
			Math.round((baseR * brightness) / 255),
			Math.round((baseG * brightness) / 255),
			Math.round((baseB * brightness) / 255),
		];
	}

	/**
	 * Samples a texture at interpolated UV coordinates and combines with lighting.
	 * @param {{ data: Uint8ClampedArray, width: number, height: number }} texture
	 * @param {Array<{ u: number, v: number }> | undefined} triUvs Per-vertex UVs for this triangle
	 * @param {number} bu Barycentric weight for vertex 0
	 * @param {number} bv Barycentric weight for vertex 1
	 * @param {number} bw Barycentric weight for vertex 2
	 * @param {number} litR Already-lit red channel [0, 255]
	 * @param {number} litG Already-lit green channel [0, 255]
	 * @param {number} litB Already-lit blue channel [0, 255]
	 * @param {boolean} isLit Whether a lighting stage (flat/Gouraud) ran before this
	 * @param {number} baseR Material red channel [0, 255]
	 * @param {number} baseG Material green channel [0, 255]
	 * @param {number} baseB Material blue channel [0, 255]
	 * @returns {[number, number, number]} Final [r, g, b] in [0, 255]
	 */
	#applyTexture(
		texture,
		triUvs,
		bu,
		bv,
		bw,
		litR,
		litG,
		litB,
		isLit,
		baseR,
		baseG,
		baseB,
	) {
		const uv0 = triUvs?.[0] ?? { u: 0, v: 0 };
		const uv1 = triUvs?.[1] ?? { u: 0, v: 0 };
		const uv2 = triUvs?.[2] ?? { u: 0, v: 0 };
		const texU = bu * uv0.u + bv * uv1.u + bw * uv2.u;
		const texV = bu * uv0.v + bv * uv1.v + bw * uv2.v;
		const texel = this.#textureSampler.sample(texture, texU, texV);

		if (isLit) {
			// Modulate texture by lighting brightness.
			const litFactor = (litR + litG + litB) / (3 * 255);
			return [
				Math.round(texel.r * litFactor),
				Math.round(texel.g * litFactor),
				Math.round(texel.b * litFactor),
			];
		}

		// Unlit: modulate texture by material color.
		return [
			Math.round((texel.r * baseR) / 255),
			Math.round((texel.g * baseG) / 255),
			Math.round((texel.b * baseB) / 255),
		];
	}
}
