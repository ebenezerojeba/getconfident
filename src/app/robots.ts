import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/sign-in", "/sign-up"],
      disallow: [
        "/api/",
        "/dashboard",
        "/practice",
        "/sessions",
        "/history",
        "/progress",
        "/achievements",
        "/settings",
        "/onboarding",
        "/styleguide",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
