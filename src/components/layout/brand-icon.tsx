import { BRAND_COLORS, markSvg } from "@/components/layout/brand-mark";

/** The mark as an <img> data URI, which next/og (Satori) renders reliably. */
export function MarkImage({
  size,
  onDark = false,
}: {
  size: number;
  /** White + light-violet version for dark backgrounds. */
  onDark?: boolean;
}) {
  const svg = onDark
    ? markSvg({ g: BRAND_COLORS.white, arrow: BRAND_COLORS.violetLight })
    : markSvg({ g: BRAND_COLORS.navy, arrow: BRAND_COLORS.violet });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser
    <img
      alt=""
      width={size}
      height={size}
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
    />
  );
}

/**
 * App icon artwork for generated PNGs (next/og): the "primary dark tile" from
 * the brand sheet. "fullBleed" fills the square edge to edge and adds padding
 * so Android's circular masks and iOS's rounded mask never clip the mark.
 */
export function BrandIcon({ size, fullBleed = false }: { size: number; fullBleed?: boolean }) {
  const mark = Math.round(size * (fullBleed ? 0.52 : 0.62));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(160deg, ${BRAND_COLORS.navyLift} 0%, ${BRAND_COLORS.navy} 70%)`,
        borderRadius: fullBleed ? 0 : Math.round(size * 0.22),
      }}
    >
      <MarkImage size={mark} onDark />
    </div>
  );
}
