/**
 * Sentry error tracking initialization.
 *
 * Set SENTRY_DSN in your environment to enable. When unset, Sentry is a
 * no-op — all calls to captureException/captureMessage silently return.
 */
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      // Scrub sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.cookie;
        delete event.request.headers.authorization;
      }
      return event;
    },
  });
  console.log("[sentry] Error tracking enabled");
}

export { Sentry };
