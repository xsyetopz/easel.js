import { createTheme } from "@mantine/core";

export const theme = createTheme({
	primaryColor: "blue",
	colors: {
		dark: [
			"#C1C2C5",
			"#A6A7AB",
			"#909296",
			"#5C5F66",
			"#373A40",
			"#2C2E33",
			"#25262B",
			"#1A1B1E",
			"#141517",
			"#101113",
		],
	},
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	fontFamilyMonospace:
		"ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
	headings: {
		fontWeight: "600",
	},
});
