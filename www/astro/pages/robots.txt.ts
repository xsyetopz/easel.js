const SITE_ORIGIN = "https://easeljs.org";

export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap-index.xml\n`,
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
}
