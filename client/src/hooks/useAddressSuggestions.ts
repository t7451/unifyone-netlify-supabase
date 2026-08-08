/**
 * useAddressSuggestions.ts
 *
 * Debounced address typeahead for RoutePulse. Queries Nominatim via the
 * tRPC suggest endpoint with a 400ms debounce and a 4-character minimum,
 * staying well within Nominatim's usage policy (max 1 req/sec).
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "./useDebounce";

const DEBOUNCE_MS = 400;
const MIN_CHARS = 4;

export function useAddressSuggestions(query: string) {
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);

  const enabled = debouncedQuery.length >= MIN_CHARS;

  const { data, isFetching } = trpc.routePulse.suggest.useQuery(
    { query: debouncedQuery },
    { enabled, staleTime: 60_000 }
  );

  const suggestions = useMemo(
    () => data?.suggestions ?? [],
    [data?.suggestions]
  );

  return {
    suggestions,
    isLoading: isFetching,
    // True when the user has typed enough chars but we're still debouncing
    // or actively fetching — useful for showing a subtle spinner.
    isPending: query.trim().length >= MIN_CHARS && (query.trim() !== debouncedQuery || isFetching),
  };
}
