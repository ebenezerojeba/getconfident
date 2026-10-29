import { ImageResponse } from "next/og";

import { BrandIcon } from "@/components/layout/brand-icon";

/** Install icons referenced by the web app manifest, generated at build time. */
const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const icon = ICONS[(await params).file];
  if (!icon) return new Response("Not found", { status: 404 });
  return new ImageResponse(<BrandIcon size={icon.size} maskable={icon.maskable} />, {
    width: icon.size,
    height: icon.size,
  });
}
