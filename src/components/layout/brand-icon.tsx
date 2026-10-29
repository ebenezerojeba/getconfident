/**
 * App icon artwork for generated PNGs (next/og). Mirrors LogoMark: a sound-wave
 * mark on the brand gradient. "maskable" adds padding so Android's circular
 * and rounded masks never clip the mark.
 */
export function BrandIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const mark = Math.round(size * (maskable ? 0.42 : 0.56));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4f46e5 0%, #f0714f 100%)",
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
      </svg>
    </div>
  );
}
