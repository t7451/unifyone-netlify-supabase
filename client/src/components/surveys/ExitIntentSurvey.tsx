import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EXIT_INTENT_SURVEY } from "@shared/surveys";
import { MicroSurvey } from "./MicroSurvey";

const SESSION_KEY = "uo_survey_exit_shown";

/**
 * Shows the exit-intent microsurvey once per session when an anonymous visitor
 * moves the cursor to leave the page (desktop). Only fires for logged-out
 * shoppers — never surveys the authenticated owner inside the dashboard.
 *
 * Mount once near the app root (inside Router).
 */
export function ExitIntentSurvey() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || user) return; // shoppers only, not the logged-in owner
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // sessionStorage blocked — fall through and rely on the in-memory guard.
    }

    let armed = true;
    const onMouseOut = (e: MouseEvent) => {
      // Cursor left through the top of the viewport → likely leaving.
      if (!armed) return;
      if (e.clientY > 0) return;
      if (e.relatedTarget) return;
      armed = false;
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // best-effort
      }
      setOpen(true);
    };

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [user, loading]);

  if (!open) return null;
  return (
    <MicroSurvey
      definition={EXIT_INTENT_SURVEY}
      variant="floating"
      onClose={() => setOpen(false)}
    />
  );
}
