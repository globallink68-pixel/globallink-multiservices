import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { mediaSource } from "./components";

export default function Seo({
  title,
  description,
  baseUrl,
  image,
  noindex = false,
}: {
  title: string;
  description: string;
  baseUrl?: string;
  image?: string | null;
  noindex?: boolean;
}) {
  const location = useLocation();
  useEffect(() => {
    document.title = title;
    const base = (baseUrl || window.location.origin).replace(/\/$/, "");
    const category = new URLSearchParams(location.search).get("category");
    const path =
      location.pathname === "/services" &&
      category &&
      /^[a-z0-9-]+$/.test(category)
        ? "/services?category=" + category
        : location.pathname;
    const canonical = base + path;
    function meta(key: string, content: string, property = false) {
      const attribute = property ? "property" : "name";
      let node = document.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      if (!node) {
        node = document.createElement("meta");
        node.setAttribute(attribute, key);
        document.head.append(node);
      }
      node.content = content;
    }
    meta("description", description);
    meta("robots", noindex ? "noindex, nofollow" : "index, follow");
    meta("og:type", "website", true);
    meta("og:title", title, true);
    meta("og:description", description, true);
    meta("twitter:title", title);
    meta("twitter:description", description);
    meta(
      "twitter:card",
      mediaSource(image) ? "summary_large_image" : "summary",
    );
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (noindex) {
      link?.remove();
      document.querySelector('meta[property="og:url"]')?.remove();
    } else {
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.append(link);
      }
      link.href = canonical;
      meta("og:url", canonical, true);
    }
    for (const [key, property] of [
      ["og:image", true],
      ["twitter:image", false],
    ] as const) {
      if (mediaSource(image) && !noindex) meta(key, base + image, property);
      else
        document
          .querySelector(`meta[${property ? "property" : "name"}="${key}"]`)
          ?.remove();
    }
  }, [
    title,
    description,
    baseUrl,
    image,
    noindex,
    location.pathname,
    location.search,
  ]);
  return null;
}
