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
			formats: ["es", "cjs", "umd"],
			name: "easel",
			fileName: (format: string) => {
				if (format === "cjs") {
					return "index.cjs";
				}

				return `index.${format}.js`;
			},
		},
		rollupOptions: {
			external: [],
			output: {
				globals: {},
			},
		},
	},
};
