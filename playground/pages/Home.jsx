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
import { CodeBlock } from "../components/CodeBlock.jsx";
import { ThreeComparison } from "../components/ThreeComparison.jsx";

const constraints = [
	{
		title: "No Z-Buffer",
		description:
			"Painter's algorithm — back-to-front sort by tile distance + layer integer.",
	},
	{
		title: "Affine UV",
		description:
			"No perspective-correct textures. UVs interpolated linearly, no W divide.",
	},
	{
		title: "HSL16 Color",
		description:
			"16-bit packed color (6H/3S/7L). Precomputed LUT to RGB. Visible banding.",
	},
	{
		title: "Integer Coords",
		description:
			"Math.trunc() on projected vertices. Vertex wobble is correct behavior.",
	},
	{
		title: "Flat + Gouraud Only",
		description:
			"No per-pixel lighting. All shading baked per-vertex or per-face.",
	},
	{
		title: "Orthographic Only",
		description:
			"No perspective camera. Affine rasterizer is only coherent under ortho.",
	},
];

const quickStart = `import {
  Scene, Camera, Renderer,
  BoxGeometry, BasicMaterial, Mesh,
} from "easel";

const renderer = new Renderer({
  canvas: document.querySelector("canvas"),
  width: 800,
  height: 600,
});
const scene = new Scene();
const camera = new Camera({
  left: -400, right: 400,
  top: 300, bottom: -300,
});

const box = new Mesh(
  new BoxGeometry(1, 1, 1),
  new BasicMaterial({ color: 0xff0000 }),
);
scene.add(box);

renderer.render(scene, camera);`;

export function Home({ onNavigate }) {
	return (
		<Container size="lg" py="xl">
			<Stack gap="xl">
				<div>
					<Title order={1} mb="xs">
						Easel.js
					</Title>
					<Text size="xl" c="dimmed" maw={600}>
						Canvas2D software renderer with a THREE.js-like scene graph API.
						Every polygon drawn by the CPU using a painter's-algorithm scanline
						rasterizer. Modeled after RuneTek 3 as observed in Old School
						RuneScape.
					</Text>
					<Group mt="md">
						<Button
							variant="filled"
							onClick={() => onNavigate("example/hello-cube")}
						>
							Try it
						</Button>
						<Button
							variant="light"
							component="a"
							href="https://github.com/xsyetopz/easel.js"
							target="_blank"
						>
							GitHub
						</Button>
					</Group>
				</div>

				<div>
					<Title order={2} mb="md">
						Rendering Constraints
					</Title>
					<Text size="sm" c="dimmed" mb="md">
						These are architectural, not bugs. They emerge from a commitment to
						the RuneTek 3 rendering model.
					</Text>
					<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
						{constraints.map((c) => (
							<Paper key={c.title} p="md" withBorder={true}>
								<Text fw={600} mb={4}>
									{c.title}
								</Text>
								<Text size="sm" c="dimmed">
									{c.description}
								</Text>
							</Paper>
						))}
					</SimpleGrid>
				</div>

				<div>
					<Title order={2} mb="md">
						THREE.js vs Easel.js
					</Title>
					<Text size="sm" c="dimmed" mb="md">
						Same scene, different renderer. The API is familiar — the
						constraints are what differ.
					</Text>
					<ThreeComparison />
				</div>

				<div>
					<Title order={2} mb="md">
						Quick Start
					</Title>
					<CodeBlock code={quickStart} />
				</div>

				<Text size="sm" c="dimmed">
					See{" "}
					<Anchor
						href="https://github.com/xsyetopz/easel.js/blob/main/docs/EASEL_vs_THREE.md"
						target="_blank"
					>
						docs/EASEL_vs_THREE.md
					</Anchor>{" "}
					for the full design reference, RuneTek 3 engine study, and API
					mapping.
				</Text>
			</Stack>
		</Container>
	);
}
