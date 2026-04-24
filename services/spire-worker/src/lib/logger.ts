// Minimal logger for the worker containers. Re-exports the redacting logger
// from @1commerce/spire so every log line scrubs API keys and tokens before
// hitting stdout / Docker's json-file driver.
export { logger, scrubForStorage } from "@1commerce/spire";
