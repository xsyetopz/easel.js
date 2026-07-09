import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

const docsSidebarGroups = [
	"Core",
	"Cameras",
	"Geometry",
	"Materials",
	"Lights",
	"Objects",
	"Animation",
	"Textures",
	"Scene",
	"Controls",
	"Helpers",
	"Math",
	"Loaders",
	"Curves",
].map((label) => ({
	label,
	collapsed: !["Core", "Cameras"].includes(label),
	items: [
		{
			autogenerate: {
				directory: `docs/${label.toLowerCase()}`,
			},
		},
	],
}));

export default defineConfig({
	base: "/",
	site: "https://easeljs.org",
	srcDir: "./www/astro",
	outDir: "./dist/www",
	integrations: [
		starlight({
			title: "easel.js docs",
			description: "Canvas2D software renderer API reference.",
			customCss: ["./www/astro/styles/starlight.scss"],
			credits: false,
			disable404Route: true,
			lastUpdated: false,
			pagination: true,
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/xsyetopz/easel.js",
				},
			],
			sidebar: [
				{ label: "Website", link: "/" },
				{ label: "Examples", link: "/examples/" },
				{ label: "API Reference", slug: "docs" },
				...docsSidebarGroups,
			],
		}),
	],
	build: {
		format: "directory",
	},
	vite: {
		resolve: {
			alias: {
				"@": new URL("./src", import.meta.url).pathname,
			},
		},
	},
});
