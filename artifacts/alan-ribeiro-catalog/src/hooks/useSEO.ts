import { useEffect } from "react";

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
  noIndex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  jsonLd?: object | object[];
}

export const BASE_URL = "https://portaldoartista.com";

export const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  "name": "Portal do Artista",
  "url": `${BASE_URL}/`,
  "description": "Plataforma para compositores e artistas apresentarem, organizarem e divulgarem seus trabalhos musicais.",
  "sameAs": [
    "https://www.instagram.com/Portaldoartista.oficial/"
  ]
};

export const WEBSITE_SCHEMA = {
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  "url": `${BASE_URL}/`,
  "name": "Portal do Artista",
  "publisher": {
    "@id": `${BASE_URL}/#organization`
  },
  "inLanguage": "pt-BR"
};

export function useSEO({
  title,
  description,
  keywords,
  ogImage,
  ogUrl,
  canonical,
  noIndex,
  breadcrumbs,
  jsonLd
}: SEOProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    if (ogImage) setMeta("og:image", ogImage, true);
    if (ogUrl) setMeta("og:url", ogUrl, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);

    // Robots meta tag
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow");
    }

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    const htmlLang = document.documentElement;
    htmlLang.setAttribute("lang", "pt-BR");

    // Build JSON-LD Graph
    const graph: object[] = [ORGANIZATION_SCHEMA, WEBSITE_SCHEMA];

    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbListSchema = {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((b, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": b.name,
          "item": b.item.startsWith("http") ? b.item : `${BASE_URL}${b.item.startsWith("/") ? "" : "/"}${b.item}`
        }))
      };
      graph.push(breadcrumbListSchema);
    }

    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        graph.push(...jsonLd);
      } else {
        graph.push(jsonLd);
      }
    }

    const fullSchema = {
      "@context": "https://schema.org",
      "@graph": graph
    };

    let scriptTag = document.getElementById("dynamic-seo-jsonld") as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "dynamic-seo-jsonld";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(fullSchema, null, 2);
  }, [
    title,
    description,
    keywords,
    ogImage,
    ogUrl,
    canonical,
    noIndex,
    JSON.stringify(breadcrumbs),
    JSON.stringify(jsonLd)
  ]);
}
