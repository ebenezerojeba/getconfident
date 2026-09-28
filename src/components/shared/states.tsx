import { AlertTriangle, CheckCircle2, Inbox, Loader2, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StateProps = {
  title: string;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

function StateShell({
  icon: Icon,
  iconClassName,
  title,
  description,
  className,
  children,
  role,
  live,
}: StateProps & {
  icon: LucideIcon;
  iconClassName?: string;
  role?: "status" | "alert";
  live?: "polite" | "assertive";
}) {
  return (
    <div
      role={role}
      aria-live={live}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground",
          iconClassName,
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <Loader2
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      role="img"
      aria-label={label}
    />
  );
}

export function LoadingState({
  title = "Loading...",
  description,
  className,
}: Partial<StateProps>) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}
    >
      <Spinner className="size-6 text-primary" label={title} />
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function EmptyState({ icon = Inbox, ...props }: StateProps & { icon?: LucideIcon }) {
  return <StateShell icon={icon} {...props} />;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem continues, refresh the page.",
  onRetry,
  retryLabel = "Try again",
  className,
  children,
}: Partial<StateProps> & { onRetry?: () => void; retryLabel?: string }) {
  return (
    <StateShell
      icon={AlertTriangle}
      iconClassName="bg-destructive/10 text-destructive"
      title={title}
      description={description}
      className={cn("border-destructive/30", className)}
      role="alert"
    >
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
      {children}
    </StateShell>
  );
}

export function SuccessState({
  icon = CheckCircle2,
  ...props
}: StateProps & { icon?: LucideIcon }) {
  return (
    <StateShell
      icon={icon}
      iconClassName="bg-success/15 text-success"
      role="status"
      live="polite"
      {...props}
    />
  );
}
