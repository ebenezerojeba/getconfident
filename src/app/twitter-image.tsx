import { siteConfig } from "@/config/site";

import OpengraphImage from "./opengraph-image";

// X/Twitter shows the same artwork as the Open Graph preview.
export const alt = `${siteConfig.name}: ${siteConfig.slogan}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpengraphImage;
