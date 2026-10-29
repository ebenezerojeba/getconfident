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
        background: "linear-gradient(140deg, #1d1a4a 0%, #4338ca 55%, #f0714f 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, fontWeight: 700 }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
          </svg>
        </div>
        {appName}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 40, opacity: 0.85 }}>My speaking score</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div style={{ fontSize: 260, fontWeight: 800, lineHeight: 1, letterSpacing: -8 }}>
            {String(score)}
          </div>
          <div style={{ fontSize: 64, opacity: 0.7, paddingBottom: 36 }}>/100</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700 }}>{scoreLabel(score)}</div>
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
              background: "rgba(255,255,255,0.14)",
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
