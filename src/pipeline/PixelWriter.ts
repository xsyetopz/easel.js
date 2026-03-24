import { MathUtils } from "../math/MathUtils.ts";
import type { ColorTable } from "./color/ColorTable.ts";

interface Framebuffer {
	setPixel(
		x: number,
		y: number,
		r: number,
		g: number,
		b: number,
		a: number,
	): void;
	getPixel(x: number, y: number): { r: number; g: number; b: number };
}

interface TranslucencyTable {
	blend(src: number, dst: number, step: number): number;
}

/** Converts 0-255 RGB to normalized 0-1 HSL. */
function rgbToHsl(
	r: number,
	g: number,
	b: number,
): { h: number; s: number; l: number } {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;
	if (max === min) return { h: 0, s: 0, l };
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
	else if (max === gn) h = ((bn - rn) / d + 2) / 6;
	else h = ((rn - gn) / d + 4) / 6;
	return { h, s, l };
}

/** Writes shaded pixels to the framebuffer with depth testing. */
export class PixelWriter {
	/** Writes a pixel to the framebuffer, blending by alpha if needed. */
	write(
		framebuffer: Framebuffer,
		x: number,
		y: number,
		r: number,
		g: number,
		b: number,
		a: number,
	): void {
		if (a <= 0) return;
		if (a >= 255) {
			framebuffer.setPixel(x, y, r, g, b, 255);
			return;
		}
		const existing = framebuffer.getPixel(x, y);
		const t = a / 255;
		const br = Math.round(existing.r + (r - existing.r) * t);
		const bg = Math.round(existing.g + (g - existing.g) * t);
		const bb = Math.round(existing.b + (b - existing.b) * t);
		framebuffer.setPixel(x, y, br, bg, bb, 255);
	}

	/** Writes an HSL16 color to the framebuffer, applying translucency if opacity < 1. */
	writeHsl16(
		framebuffer: Framebuffer,
		x: number,
		y: number,
		hsl16: number,
		colorTable: ColorTable,
		opacity: number,
		translucencyTable: TranslucencyTable,
	): void {
		if (opacity <= 0) return;

		let finalHsl16 = hsl16;

		if (opacity < 1) {
			const step = Math.round(opacity * 8);
			const existing = framebuffer.getPixel(x, y);
			const { h, s, l } = rgbToHsl(existing.r, existing.g, existing.b);
			const dstHsl16 = MathUtils.packHsl16(h, s, l);
			finalHsl16 = translucencyTable.blend(hsl16, dstHsl16, step);
		}

		const { r, g, b } = colorTable.lookup(finalHsl16);
		framebuffer.setPixel(x, y, r, g, b, 255);
	}
}
