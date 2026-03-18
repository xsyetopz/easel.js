import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
	root: ".",
	build: {
		lib: {
			entry: "src/index.js",
			fileName: (format, entryName) => `${entryName}.${format}.js`,
			name: "Easel",
		},
		rollupOptions: {
			external: [],
			output: {
				globals: {},
			},
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
};
