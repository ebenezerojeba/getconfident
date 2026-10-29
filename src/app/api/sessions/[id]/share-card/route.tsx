import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import { ShareCardImage } from "@/features/ai-coach/components/share-card-image";
import { getSessionReport } from "@/features/ai-coach/report-data";
import { parseId, withUser } from "@/lib/api";
import { notFound } from "@/lib/errors";

const SIZE = 1080;

/**
 * A square, social-friendly image of a session's results for its owner to
 * share. It shows scores and the topic only: never the transcript or recording.
 */
export const GET = withUser<{ id: string }>(async (_req, { user, params }) => {
  const result = await getSessionReport(user.id, parseId(params.id, "Session"));
  if (!result.ok) throw notFound("Session");
  const { report, fillers, speech, session } = result.data;

  const stats = [
    { label: "Clarity", value: report.dimensions.clarity.score ?? "–" },
    { label: "Confidence", value: report.dimensions.confidence.score ?? "–" },
    { label: "Filler words", value: fillers.totalFillers },
    {
      label: "Words / min",
      value: speech.wordsPerMinute ? Math.round(speech.wordsPerMinute) : "–",
    },
  ];
  const topic =
    session.topicText.length > 110 ? `${session.topicText.slice(0, 107)}…` : session.topicText;
  const host = new URL(siteConfig.url).host;

  const image = new ImageResponse(
    <ShareCardImage
      appName={siteConfig.name}
      host={host}
      score={report.overallScore}
      topic={topic}
      stats={stats}
    />,
    { width: SIZE, height: SIZE },
  );
  image.headers.set("Cache-Control", "private, no-store");
  return image;
});
