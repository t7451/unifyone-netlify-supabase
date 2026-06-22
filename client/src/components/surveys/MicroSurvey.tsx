import { useState } from "react";
import { X } from "lucide-react";
import type { SurveyDefinition } from "@shared/surveys";
import { trpc } from "@/lib/trpc";
import { getVisitorId } from "@/lib/visitor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * A small voice-of-customer survey: a question, quick-pick options, and an
 * optional free-text comment. Submits to surveys.submit and thanks the visitor.
 *
 * `variant="floating"` renders a dismissible bottom-right card (exit-intent);
 * `variant="inline"` renders in flow (post-purchase).
 */
export function MicroSurvey({
  definition,
  variant = "inline",
  onClose,
}: {
  definition: SurveyDefinition;
  variant?: "floating" | "inline";
  onClose?: () => void;
}) {
  const submit = trpc.surveys.submit.useMutation();
  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = !!selected || comment.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || submit.isPending) return;
    const answer = [selected, comment.trim()].filter(Boolean).join(" — ");
    submit.mutate({
      surveyType: definition.type,
      question: definition.question,
      answer: answer.slice(0, 1000),
      anonymousId: getVisitorId() ?? undefined,
      path:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    setDone(true);
    if (variant === "floating") {
      window.setTimeout(() => onClose?.(), 1600);
    }
  };

  const card = (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-neutral-950/95 p-4 text-left shadow-xl backdrop-blur",
        variant === "inline" && "bg-card/80"
      )}
    >
      {onClose ? (
        <button
          type="button"
          aria-label="Dismiss survey"
          onClick={onClose}
          className="float-right -mt-1 text-gray-500 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {done ? (
        <p className="py-4 text-sm font-medium text-emerald-300">
          Thanks for the feedback! 🙏
        </p>
      ) : (
        <>
          <p className="mb-3 pr-5 text-sm font-medium text-white">
            {definition.question}
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {definition.options.map(option => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setSelected(prev => (prev === option ? null : option))
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  selected === option
                    ? "border-amber-400 bg-amber-400/15 text-amber-200"
                    : "border-white/15 bg-white/5 text-gray-300 hover:bg-white/10"
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 1000))}
            placeholder="Anything else? (optional)"
            rows={2}
            className="mb-3 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400/50 focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2">
            {onClose ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                No thanks
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={!canSubmit || submit.isPending}
              onClick={handleSubmit}
              className="bg-amber-400 text-neutral-950 hover:bg-amber-300"
            >
              {submit.isPending ? "Sending…" : "Submit"}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (variant === "floating") {
    return (
      <div
        role="dialog"
        aria-label="Quick survey"
        className="fixed bottom-4 right-4 z-[90] w-[min(92vw,22rem)]"
      >
        {card}
      </div>
    );
  }
  return card;
}
