import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

const apiSidebarGroups = [
  "Core",
  "Cameras",
  "Geometry",
  "Materials",
  "Lights",
  "Objects",
  "Physics",
  "Animation",
  "Textures",
  "Scene",
  "Controls",
  "Helpers",
  "Math",
  "Loaders",
  "Curves",
  "Pipeline",
  "Renderers",
  "Utilities",
].map((label) => ({
  label,
  collapsed: true,
  items: [
    {
      autogenerate: {
        directory: `docs/${label.toLowerCase()}`,
      },
    },
  ],
}));

const manualSidebar = [
  { slug: "manual" },
  { slug: "manual/install" },
  { slug: "manual/first-scene" },
  { slug: "manual/renderer-model" },
  { slug: "manual/cameras-and-controls" },
  { slug: "manual/geometry-and-materials" },
  { slug: "manual/animation" },
  { slug: "manual/textures-and-loaders" },
];

export default defineConfig({
  base: "/",
  site: "https://easeljs.org",
  srcDir: "./www/astro",
  outDir: "./dist/www",
  integrations: [
    starlight({
      title: "EASEL.js",
      description: "Canvas2D software renderer documentation.",
      customCss: ["./www/astro/styles/starlight.scss"],
      credits: false,
      disable404Route: true,
      lastUpdated: false,
      pagination: true,
      social: [],
      markdown: {
        processedDirs: ["./www/astro/content/manual"],
      },
      components: {
        Header: "./www/components/StarlightHeader.astro",
        MobileMenuFooter: "./www/components/StarlightMobileMenuFooter.astro",
        ThemeProvider: "./www/components/StarlightThemeProvider.astro",
      },
      sidebar: [
        {
          label: "Manual",
          collapsed: false,
          items: manualSidebar,
        },
        {
          label: "API reference",
          collapsed: false,
          items: [{ slug: "docs" }, ...apiSidebarGroups],
        },
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
