import type { LucideIcon } from "lucide-react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorStateProps {
  /** Lucide icon rendered inside the red circle. */
  icon: LucideIcon;
  /** Short user-facing title, e.g. "Failed to load customers". */
  title: string;
  /** Optional detail from the caught error. */
  message?: string | null;
  /** Called when the user clicks the retry button. */
  onRetry: () => void;
  /** Show a spinner on the retry button while a refetch is in-flight. */
  isRetrying?: boolean;
  /** Controls the icon circle / icon size. Defaults to "md". */
  size?: "sm" | "md";
}

/**
 * Reusable error state for query failures.
 *
 * Renders a red icon circle, a title, an optional error detail, and a retry
 * button that swaps to a spinner while the refetch is in progress.
 *
 * The component renders an unstyled `div` with `inline-flex flex-col` layout —
 * wrap it in whatever container suits the surrounding context
 * (e.g. a `<td>`, a `<div className="text-center py-20">`).
 */
export function QueryErrorState({
  icon: Icon,
  title,
  message,
  onRetry,
  isRetrying = false,
  size = "md",
}: QueryErrorStateProps) {
  const circleSize = size === "sm" ? "w-12 h-12" : "w-14 h-14";
  const iconSize = size === "sm" ? "w-6 h-6" : "w-7 h-7";

  return (
    <div className="inline-flex flex-col items-center gap-3" role="alert">
      <div
        className={`${circleSize} rounded-full bg-red-500/10 flex items-center justify-center`}
        aria-hidden="true"
      >
        <Icon className={`${iconSize} text-red-400`} />
      </div>
      <div className="text-center">
        <p className="text-red-400 font-medium">{title}</p>
        <p className="text-gray-500 text-sm mt-1">
          {message ?? "An unexpected error occurred"}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-white/10 text-gray-300 hover:text-white gap-1.5"
        onClick={onRetry}
        aria-label={isRetrying ? "Retrying…" : "Try again"}
      >
        {isRetrying ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            Retrying…
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Try again
          </>
        )}
      </Button>
    </div>
  );
}
