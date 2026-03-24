import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
	root: ".",
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	build: {
		lib: {
			entry: "src/index.ts",
			name: "easel",
			fileName: (format: string, entryName: string) =>
				`${entryName}.${format}.js`,
		},
		rollupOptions: {
			external: [],
			output: {
				globals: {},
			},
		},
	},
};
