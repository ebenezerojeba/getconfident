import { LoadingState } from "@/components/shared/states";

export default function Loading() {
  return (
    <div className="container-page flex min-h-[60dvh] items-center justify-center">
      <LoadingState />
    </div>
  );
}
