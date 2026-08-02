import * as EASEL from "@xsyetopz/easel";
import { type BlockWorld, buildSimpleVoxelChunk } from "./mesher.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("Missing canvas");
const renderer = new EASEL.Renderer({ width: 320, height: 180, canvas });
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
	fov: 60,
	aspect: 320 / 180,
	near: 0.1,
	far: 100,
});
camera.position.set(6, 6, 8);
camera.lookAt(4, 0, 4);
scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
const world: BlockWorld = {
	getBlock: (_x, y) => (y === 0 ? 1 : 0),
	isTransparent: () => false,
	uvFor: () => [0, 0, 1, 1],
};
scene.add(
	new EASEL.Mesh(
		buildSimpleVoxelChunk(world, 8, 2, 8),
		new EASEL.BasicMaterial({ color: 0x44aa44 }),
	),
);
function frame() {
	renderer.render(scene, camera);
	requestAnimationFrame(frame);
}
frame();
