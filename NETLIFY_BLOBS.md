# Netlify Blobs Integration

This project uses **Netlify Blobs** as its object store for user-generated
and AI-generated content (product images, generated images, clipper
outputs, etc.).

## Architecture

```
caller (imageGeneration.ts, clipperWorker.ts, ...)
   │
   ▼
server/storage.ts   →   Netlify Blobs (store: "uploads")
                              │
                              ▼
                    /blobs/*  (public read function)
                              │
                              ▼
                    /.netlify/images?url=/blobs/...  (Image CDN)
```

Public reads are served by `netlify/functions/blobs-serve.mts` mounted at
`/blobs/*`. Image transforms go through the Netlify Image CDN at
`/.netlify/images?url=/blobs/<key>&w=...`.

## Configuration

- `NETLIFY_BLOBS_STORE` — namespace name (default `uploads`).
- `NETLIFY_SITE_ID` + `NETLIFY_BLOBS_TOKEN` — only needed when calling
  Blobs from outside a Netlify function (e.g. local CLI scripts or the
  backfill script). Inside functions, credentials are auto-injected.

## Server usage

```ts
import { storagePut, storageGet } from "server/storage";

// write
const { key, url } = await storagePut(
  `products/${id}/main.jpg`,
  buffer,
  "image/jpeg"
);
// url → "/blobs/products/<id>/main.jpg"

// read (returns a public URL)
const { url } = await storageGet(`products/${id}/main.jpg`);
```

## Client usage

```tsx
import { blobImage, blobUrl } from "@/lib/blobImage";

<img
  src={blobImage("products/123/main.jpg", { w: 800, fit: "cover", fm: "webp" })}
  alt="Product"
/>;

// Raw download:
<a href={blobUrl("invoices/abc.pdf")}>Invoice</a>;
```

## Recommended Netlify extensions

Install from the Netlify UI → **Extensions**:

- **Stripe** — auto-injects `STRIPE_*` env vars and adds dashboard widgets.
- **Supabase** — auto-injects `SUPABASE_*` env vars (until removal completes).
- **Neon** — auto-injects `DATABASE_URL` / `NETLIFY_DATABASE_URL`.
- **Sentry** — release tracking and source map upload.

## Migration notes

- Existing forge URLs are persisted as-is in the database; nothing rewrites
  them. New uploads always use Blobs.
- To backfill (re-upload existing forge content to Blobs), use
  `scripts/backfill-forge-to-blobs.ts` with a JSON manifest of keys.
- The forge storage backend has been removed from `server/storage.ts`.
  `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` are still used by
  LLM, voice transcription, image generation, maps, and dataApi — do not
  unset them.

## Limits

See https://docs.netlify.com/build/data-and-storage/netlify-blobs/ for the
full list. Most relevant:

- 5 GB max per object
- 600-byte max key length
- 2 KB max metadata per object
- Eventual consistency by default (≤60 s propagation)
