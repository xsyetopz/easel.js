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

const DEFAULT_GITHUB_REPOSITORY = "xsyetopz/easel.js";
const configuredRepository = process.env.GITHUB_REPOSITORY?.trim();
const githubRepository =
  configuredRepository && /^[^/]+\/[^/]+$/.test(configuredRepository)
    ? configuredRepository
    : DEFAULT_GITHUB_REPOSITORY;
const [githubOwner, githubProject] = githubRepository.split("/");
const isGitHubPagesBuild = process.env.EASEL_GITHUB_PAGES === "true";
const githubPagesBase = `/${githubProject}/`;
const githubPagesSite = `https://${githubOwner}.github.io${githubPagesBase}`;
const baseAwareMarkdownLinks = {
  name: "base-aware-markdown-links",
  hooks: {
    "astro:config:setup": ({ config }) => {
      const basePath = config.base.replace(/\/+$/u, "");
      const processor = config.markdown?.processor;
      if (!processor?.options?.mdastPlugins) return;

      processor.options.mdastPlugins.push({
        name: "prefix-site-links",
        link(node, context) {
          if (
            !basePath ||
            !node.url.startsWith("/") ||
            node.url.startsWith("//") ||
            node.url === basePath ||
            node.url.startsWith(`${basePath}/`)
          ) {
            return;
          }

          context.replaceNode(node, { ...node, url: `${basePath}${node.url}` });
        },
      });
    },
  },
};

export default defineConfig({
  base: isGitHubPagesBuild ? githubPagesBase : "/",
  site: isGitHubPagesBuild ? githubPagesSite : "https://easeljs.org",
  srcDir: "./www/astro",
  publicDir: "./www/public",
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
    baseAwareMarkdownLinks,
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
