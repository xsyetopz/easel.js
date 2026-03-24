/** Scanline edge walker for triangle rasterization. */
export class EdgeWalker {
	/**
	 * Walks integer pixels along a line from (x1,y1) to (x2,y2) using
	 * Bresenham's line algorithm.
	 */
	walk(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		callback: (x: number, y: number) => void,
	): void {
		const dx = Math.abs(x2 - x1);
		const dy = Math.abs(y2 - y1);
		const sx = x1 < x2 ? 1 : -1;
		const sy = y1 < y2 ? 1 : -1;
		let err = dx - dy;
		let cx = x1;
		let cy = y1;

		while (true) {
			callback(cx, cy);
			if (cx === x2 && cy === y2) break;
			const e2 = err << 1;
			if (e2 > -dy) {
				err -= dy;
				cx += sx;
			}
			if (e2 < dx) {
				err += dx;
				cy += sy;
			}
		}
	}
}
