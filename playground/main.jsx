import "@mantine/core/styles.css";
import "@mantine/code-highlight/styles.css";

import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { theme } from "./theme.js";

createRoot(document.getElementById("root")).render(
	<MantineProvider theme={theme} defaultColorScheme="dark">
		<App />
	</MantineProvider>,
);
