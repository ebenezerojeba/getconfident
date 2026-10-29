import { ImageResponse } from "next/og";

import { BrandIcon } from "@/components/layout/brand-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iPhone and iPad (iOS applies its own rounded mask). */
export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={180} maskable />, size);
}
