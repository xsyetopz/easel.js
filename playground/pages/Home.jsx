import {
	Anchor,
	Button,
	Container,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { CodeToggle } from "../components/CodeToggle.jsx";
import { navigate } from "../hooks/navigate.js";

const easelQuickStart = `import * as EASEL from "easel";

const renderer = new EASEL.Renderer({
  canvas: document.querySelector("canvas"),
  width: 800, height: 600,
});
const scene = new EASEL.Scene();
const camera = new EASEL.PerspectiveCamera({
  fov: 45,
  aspect: 800 / 600,
});
camera.position.z = 5;

scene.add(new EASEL.AmbientLight(0xffffff, 0.4));
const light = new EASEL.DirectionalLight(0xffffff, 0.8);
light.position.set(3, 5, 4);
scene.add(light);

const box = new EASEL.Mesh(
  new EASEL.BoxGeometry(1, 1, 1),
  new EASEL.LambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();`;

const threeQuickStart = `import * as THREE from "three";

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("canvas"),
});
renderer.setSize(800, 600);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45, 800 / 600, 0.1, 1000,
);
camera.position.z = 5;

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(3, 5, 4);
scene.add(light);

const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0xff4444 }),
);
scene.add(box);

function animate() {
  requestAnimationFrame(animate);
  box.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();`;

const highlights = [
	{
		title: "THREE.js-like API",
		description:
			"Same scene graph concepts - Scene, Mesh, Camera, Light. If you know THREE.js, you already know the API.",
	},
	{
		title: "CPU Software Renderer",
		description:
			"Every pixel drawn by the CPU using a painter's-algorithm scanline rasterizer. No WebGL required.",
	},
	{
		title: "Canvas2D Output",
		description:
			"Renders to a standard HTML5 Canvas via ImageData. Works everywhere, no GPU needed.",
	},
];

export function Home() {
	return (
		<Container size="lg" py="xl">
			<Stack gap="xl">
				<div>
					<Title order={1} mb="xs">
						easel.js
					</Title>
					<Text size="xl" c="dimmed" maw={600}>
						Canvas2D software renderer with a THREE.js-like scene graph API.
						Build 3D scenes rendered entirely by the CPU.
					</Text>
					<Group mt="md">
						<Button
							variant="filled"
							onClick={() => navigate("examples/hello-cube")}
						>
							Get Started
						</Button>
						<Button variant="light" onClick={() => navigate("examples")}>
							Examples
						</Button>
					</Group>
				</div>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
					{highlights.map((h) => (
						<Paper key={h.title} p="md" withBorder={true}>
							<Text fw={600} mb={4}>
								{h.title}
							</Text>
							<Text size="sm" c="dimmed">
								{h.description}
							</Text>
						</Paper>
					))}
				</SimpleGrid>

				<div>
					<Title order={2} mb="md">
						Quick Start
					</Title>
					<Text size="sm" c="dimmed" mb="md">
						Same scene setup, different renderer. Toggle to compare.
					</Text>
					<CodeToggle
						easelSource={easelQuickStart}
						threeSource={threeQuickStart}
					/>
				</div>

				<Text size="sm" c="dimmed">
					See the{" "}
					<Anchor
						onClick={(e) => {
							e.preventDefault();
							navigate("docs");
						}}
						style={{ cursor: "pointer" }}
					>
						API documentation
					</Anchor>{" "}
					for the full reference, or browse{" "}
					<Anchor
						onClick={(e) => {
							e.preventDefault();
							navigate("examples");
						}}
						style={{ cursor: "pointer" }}
					>
						examples
					</Anchor>{" "}
					to see it in action.
				</Text>
			</Stack>
		</Container>
	);
}
