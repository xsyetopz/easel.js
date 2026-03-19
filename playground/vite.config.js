import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/",
	root: resolve(import.meta.dirname, ".."),
	plugins: [react()],
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "../src"),
		},
	},
	build: {
		outDir: "dist/playground",
		emptyOutDir: true,
	},
});
