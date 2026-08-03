import { SITE_ORIGIN } from "../../seo.ts";
import { loadStaticRouteEntries } from "../staticRoutes.ts";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = await loadStaticRouteEntries();
  const body = entries
    .map(
      (entry) =>
        `<url><loc>${SITE_ORIGIN}${entry.path}</loc><lastmod>${today}</lastmod></url>`,
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>\n`,
    {
      headers: {
        "content-type": "application/xml; charset=utf-8",
      },
    },
  );
}
