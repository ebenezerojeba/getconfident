import { ImageResponse } from "next/og";

import { MarkImage } from "@/components/layout/brand-icon";
import { BRAND_COLORS } from "@/components/layout/brand-mark";
import { siteConfig } from "@/config/site";
import { brandFonts } from "@/lib/og-fonts";

export const alt = `${siteConfig.name}: ${siteConfig.slogan}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: `radial-gradient(ellipse 80% 70% at 85% 0%, #2a2a8a 0%, ${BRAND_COLORS.navy} 65%)`,
        color: "white",
        fontFamily: "Plus Jakarta Sans",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 48 }}>
        <MarkImage size={72} onDark />
        <div style={{ display: "flex", letterSpacing: -1.5 }}>
          <span style={{ color: BRAND_COLORS.violetLight, fontWeight: 500 }}>Get</span>
          <span style={{ fontWeight: 800 }}>Confident</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          <span>Speak Clearly.</span>
          <span style={{ color: BRAND_COLORS.violetLight }}>Speak Confidently.</span>
        </div>
        <div style={{ fontSize: 32, opacity: 0.8 }}>
          Random topics · A focused timer · Instant AI coaching
        </div>
      </div>
    </div>,
    { ...size, fonts: await brandFonts() },
  );
}
