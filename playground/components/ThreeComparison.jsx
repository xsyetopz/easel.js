import { Grid, Paper, Title } from "@mantine/core";
import { CodeBlock } from "./CodeBlock.jsx";

const threeCode = `import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -400, 400, 300, -300, 0.1, 1000
);
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(800, 600);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({
  color: 0xff0000,
});
const box = new THREE.Mesh(geometry, material);
scene.add(box);

renderer.render(scene, camera);`;

const easelCode = `import {
  Scene, Camera, Renderer,
  BoxGeometry, BasicMaterial, Mesh,
} from "easel";

const scene = new Scene();
const camera = new Camera({
  left: -400, right: 400,
  top: 300, bottom: -300,
  near: 0.1, far: 1000,
});
const renderer = new Renderer({ canvas, width: 800, height: 600 });

const geometry = new BoxGeometry(1, 1, 1);
const material = new BasicMaterial({ color: 0xff0000 });
const box = new Mesh(geometry, material);
scene.add(box);

renderer.render(scene, camera);`;

export function ThreeComparison() {
	return (
		<Grid>
			<Grid.Col span={{ base: 12, md: 6 }}>
				<Paper p="xs" withBorder={true}>
					<Title order={5} mb="xs" c="dimmed">
						THREE.js
					</Title>
					<CodeBlock code={threeCode} />
				</Paper>
			</Grid.Col>
			<Grid.Col span={{ base: 12, md: 6 }}>
				<Paper p="xs" withBorder={true}>
					<Title order={5} mb="xs" c="blue.4">
						Easel.js
					</Title>
					<CodeBlock code={easelCode} />
				</Paper>
			</Grid.Col>
		</Grid>
	);
}
