/**
 * UnifyOne — Optional `Result` helper (shared client + server)
 *
 * A tiny, dependency-free discriminated-union type for modelling
 * success-or-failure outcomes without throwing. This is OPTIONAL scaffolding
 * that future refactor units MAY adopt in the `service`/`repo` layers (see
 * `docs/ARCHITECTURE.md`) — it is intentionally NOT wired into any existing
 * module, so introducing it changes no current behavior.
 *
 * Throwing `HttpError` (see `shared/_core/errors.ts`) remains the established
 * convention at the transport boundary; `Result` is for inner code paths that
 * prefer to return failures as values.
 */

/** A successful outcome carrying a value. */
export type Ok<T> = { readonly ok: true; readonly value: T };

/** A failed outcome carrying an error. */
export type Err<E> = { readonly ok: false; readonly error: E };

/** Either a success (`Ok`) or a failure (`Err`). */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/** Wrap a value as a successful `Result`. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Wrap an error as a failed `Result`. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Type guard: narrows a `Result` to its `Ok` branch. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** Type guard: narrows a `Result` to its `Err` branch. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}
