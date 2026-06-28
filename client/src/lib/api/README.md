# `client/src/lib/api` — client data-access layer

A thin, typed data-access layer that sits between pages and the tRPC client.
Pages call these hooks instead of touching `trpc.*` directly, which keeps
data-fetching concerns out of the view and makes query/mutation usage easy to
find, reuse, and reason about.

## Convention

- **One module per feature/page**, named `use<Feature>Data.ts`
  (e.g. `useCustomersData.ts`, `useTeamData.ts`).
- Each module exports **small, named hooks** that wrap a single
  `trpc.<router>.<proc>.useQuery` / `.useMutation` call:
  - Queries → `use<Thing>Query()`
  - Mutations → `use<Action>Mutation(options)`
- **Behavior must match the inline call exactly**: same procedure, same input,
  same query key, same `enabled` / `staleTime` / refetch options, and the same
  cache invalidations.
- **Side effects stay in the page.** Mutations that show toasts, reset dialog
  state, navigate, or track analytics take an `options` object with
  `onSuccess` / `onError` callbacks and forward to them, so the page keeps its
  closures over component state. Cache invalidations that always happen
  (via `trpc.useUtils()`) live inside the hook.

## Example

```ts
// in the hook module
export function useDiscountListQuery() {
  return trpc.discounts.list.useQuery();
}

export function useCreateDiscountMutation(options: {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.discounts.create.useMutation({
    onSuccess: () => {
      utils.discounts.list.invalidate();
      options.onSuccess();
    },
    onError: error => options.onError(error),
  });
}
```

```tsx
// in the page
const list = useDiscountListQuery();
const create = useCreateDiscountMutation({
  onSuccess: () => {
    toast.success("Discount created");
    setOpen(false);
  },
  onError: e => toast.error(e.message),
});
```

The hooks are React hooks: call them at the top level of a component, following
the rules of hooks.
