import { Router, type IRouter } from "express";
import { db, artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const BASE_URL = process.env.PORTAL_URL || "https://portaldoartista.com";

router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const artists = await db.select({
      slug: artistsTable.slug,
      updatedAt: artistsTable.updatedAt,
    }).from(artistsTable).where(eq(artistsTable.planoAtivo, true));

    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/artistas", priority: "0.9", changefreq: "daily" },
      { url: "/vip", priority: "0.7", changefreq: "weekly" },
      { url: "/demo", priority: "0.6", changefreq: "monthly" },
    ];

    const now = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Artist pages
    for (const artist of artists) {
      const lastmod = artist.updatedAt ? new Date(artist.updatedAt).toISOString().split("T")[0] : now.split("T")[0];
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/a/${artist.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.set("Content-Type", "text/xml");
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

export default router;