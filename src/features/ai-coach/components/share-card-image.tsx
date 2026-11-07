import { MarkImage } from "@/components/layout/brand-icon";
import { BRAND_COLORS } from "@/components/layout/brand-mark";
import { scoreLabel } from "@/features/ai-coach/components/report-parts";

export type ShareCardData = {
  appName: string;
  host: string;
  score: number;
  topic: string;
  stats: { label: string; value: string | number }[];
};

/** Artwork for the shareable results image (rendered with next/og). */
export function ShareCardImage({ appName, host, score, topic, stats }: ShareCardData) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: `radial-gradient(ellipse 90% 60% at 90% 0%, #2a2a8a 0%, ${BRAND_COLORS.navy} 60%)`,
        color: "white",
        fontFamily: "Plus Jakarta Sans",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, fontWeight: 700 }}
      >
        <MarkImage size={72} onDark />
        <div style={{ display: "flex", letterSpacing: -1 }} aria-label={appName}>
          <span style={{ color: BRAND_COLORS.violetLight, fontWeight: 500 }}>Get</span>
          <span style={{ fontWeight: 800 }}>Confident</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 40, opacity: 0.85 }}>My speaking score</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ fontSize: 260, fontWeight: 800, lineHeight: 1, letterSpacing: -8 }}>
            {String(score)}
          </div>
          <div style={{ fontSize: 64, opacity: 0.7, paddingBottom: 36 }}>/100</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: BRAND_COLORS.violetLight }}>
          {scoreLabel(score)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "22px 24px",
              borderRadius: 24,
              background: "rgba(255,255,255,0.08)",
              border: "2px solid rgba(164,151,255,0.25)",
            }}
          >
            <div style={{ fontSize: 56, fontWeight: 800 }}>{String(s.value)}</div>
            <div style={{ fontSize: 26, opacity: 0.85 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 32, opacity: 0.9, lineHeight: 1.35 }}>{`“${topic}”`}</div>
        <div
          style={{ fontSize: 28, opacity: 0.75 }}
        >{`Practise impromptu speaking at ${host}`}</div>
      </div>
    </div>
  );
}
