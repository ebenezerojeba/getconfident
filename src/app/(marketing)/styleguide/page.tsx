import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SiteHeader } from "@/components/layout/site-header";
import { EmptyState, ErrorState, LoadingState, SuccessState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

// Internal design-system reference. Not available in production builds.
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();

  const swatches = [
    "bg-background",
    "bg-card",
    "bg-primary",
    "bg-secondary",
    "bg-muted",
    "bg-accent",
    "bg-destructive",
    "bg-success",
    "bg-warning",
    "bg-brand-gradient",
    "bg-chart-1",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
  ];

  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page space-y-12 py-10">
        <PageHeader title="Design system" description="Tokens, typography and shared states." />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Colour</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {swatches.map((s) => (
              <div key={s} className="space-y-1.5">
                <div className={`h-14 rounded-xl border ${s}`} />
                <p className="font-mono text-xs text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Typography</h2>
          <p className="text-display font-semibold">
            Speak <span className="text-brand-gradient">boldly</span>
          </p>
          <p className="text-title font-semibold">Title scale</p>
          <p className="text-lg">Body large. Clear, confident, calm.</p>
          <p className="text-muted-foreground">Muted body copy for secondary information.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Controls</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
            <Badge>Badge</Badge>
            <Badge variant="secondary">Secondary</Badge>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card</CardTitle>
              <CardDescription>Rounded surface with subtle border.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <LoadingState title="Analyzing your speech" description="This usually takes a moment." />
          <EmptyState
            title="No sessions yet"
            description="Your practice history will appear here."
          />
          <ErrorState description="We couldn't load this section." />
          <SuccessState title="Saved" description="Your recording was uploaded." />
        </section>
      </main>
    </>
  );
}
