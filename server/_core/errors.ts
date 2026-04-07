/**
 * Type-safe error message extraction.
 * Replaces the `catch (err: any) { err.message }` anti-pattern.
 */
export function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
