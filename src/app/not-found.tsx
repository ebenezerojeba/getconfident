import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-[70dvh] items-center justify-center py-16">
      <EmptyState
        icon={Compass}
        className="w-full max-w-lg"
        title="Page not found"
        description="The page you're looking for doesn't exist or you don't have access to it."
      >
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </EmptyState>
    </main>
  );
}
