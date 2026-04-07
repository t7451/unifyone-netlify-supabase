/**
 * Lazy-loaded wrapper around `streamdown` so the markdown renderer
 * (which pulls in mermaid + cytoscape + shiki — ~1 MB combined) is
 * code-split into a separate chunk and only loaded when an AI assistant
 * actually needs to render markdown.
 */
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const StreamdownInner = lazy(() =>
  import("streamdown").then(m => ({ default: m.Streamdown }))
);

export function StreamdownLazy({ children }: { children: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Loading renderer…
        </div>
      }
    >
      <StreamdownInner>{children}</StreamdownInner>
    </Suspense>
  );
}
