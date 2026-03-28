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
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) return undefined;
					if (id.includes("@mantine/")) return "mantine";
					if (
						id.includes("/react/") ||
						id.includes("/react-dom/") ||
						id.includes("/scheduler/")
					) {
						return "react-vendor";
					}
					if (id.includes("@floating-ui/")) return "floating-ui";
					if (id.includes("@tabler/icons-react/")) return "tabler-icons";
					return "vendor";
				},
			},
		},
	},
});
