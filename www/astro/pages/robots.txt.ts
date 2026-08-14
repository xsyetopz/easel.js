import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const sitemapUrl = new URL("sitemap-index.xml", site ?? url).href;

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
