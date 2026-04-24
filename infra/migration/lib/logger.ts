import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.stdout.isTTY
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss" },
      }
    : undefined,
});

export function dryRunBanner(dryRun: boolean): void {
  if (dryRun) {
    logger.warn(
      "DRY_RUN=true — scripts will log intent but perform zero writes to Clerk or Neon."
    );
  } else {
    logger.warn(
      "DRY_RUN=false — LIVE RUN. Writes will be applied to Clerk and Neon."
    );
  }
}
