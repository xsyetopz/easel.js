import { createTheme } from "@mantine/core";

export const theme = createTheme({
	primaryColor: "indigo",
	colors: {
		dark: [
			"#C1C2C5",
			"#A6A7AB",
			"#909296",
			"#5C5F66",
			"#373A40",
			"#2C2E33",
			"#25262B",
			"#1E1F23",
			"#18191C",
			"#131416",
		],
	},
	other: {
		lightBody: "#f8f7f5",
		lightCard: "#ffffff",
		lightBorder: "#e8e6e1",
	},
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	fontFamilyMonospace:
		"ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
	headings: {
		fontWeight: "600",
	},
});
