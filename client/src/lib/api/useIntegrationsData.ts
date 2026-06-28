import { trpc } from "@/lib/trpc";

/**
 * Data-access hooks for the Integrations page. Thin, typed wrappers around the
 * exact `trpc.integrations.*` calls the page made inline — same procedures,
 * inputs, query keys, and invalidations. Side-effect callbacks (toasts,
 * activation tracking, field resets) stay in the page and are forwarded
 * through, so closures over component state are preserved.
 */

export function useIntegrationStatusQuery() {
  return trpc.integrations.status.useQuery();
}

export function useShopifyConnectMutation(options: {
  onSuccess: () => void;
  onError: (e: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.integrations.shopifyConnect.useMutation({
    onSuccess: () => {
      utils.integrations.status.invalidate();
      options.onSuccess();
    },
    onError: (e: any) => options.onError(e),
  });
}

export function useShopifySetCheckoutUrlMutation(options: {
  onSuccess: () => void;
  onError: (e: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.integrations.shopifySetCheckoutUrl.useMutation({
    onSuccess: () => {
      utils.integrations.status.invalidate();
      options.onSuccess();
    },
    onError: (e: any) => options.onError(e),
  });
}

export function useN8nUpdateMutation(options: {
  onSuccess: () => void;
  onError: (e: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.integrations.n8nUpdate.useMutation({
    onSuccess: () => {
      utils.integrations.status.invalidate();
      options.onSuccess();
    },
    onError: (e: any) => options.onError(e),
  });
}

export function useN8nTriggerMutation(options: {
  onSuccess: () => void;
  onError: (e: { message: string }) => void;
}) {
  return trpc.integrations.n8nTrigger.useMutation({
    onSuccess: () => options.onSuccess(),
    onError: (e: any) => options.onError(e),
  });
}
