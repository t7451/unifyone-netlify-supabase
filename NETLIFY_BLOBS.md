# Netlify Blobs Integration

This project uses **Netlify Blobs** as its primary object store for
user-generated and AI-generated content (product images, generated images,
clipper outputs, etc.). It replaces the legacy "forge" storage proxy as the
default backend on Netlify deployments.

## Architecture

```
caller (imageGeneration.ts, clipperWorker.ts, ...)
   │
   ▼
server/storage.ts            ← shared {key, url} interface
   │
   ├── Netlify Blobs   (default on Netlify)
   └── Forge proxy     (legacy fallback)
```

Public reads are served by `netlify/functions/blobs-serve.mts` mounted at
`/blobs/*`. Image transforms go through the Netlify Image CDN at
`/.netlify/images?url=/blobs/<key>&w=...`.

## Selecting the backend

`STORAGE_BACKEND` env var controls behavior:

| Value   | Behavior                                                 |
| ------- | -------------------------------------------------------- |
| `auto`  | Default. Blobs when `NETLIFY=true`, else forge if creds. |
| `blobs` | Force Netlify Blobs.                                     |
| `forge` | Force the legacy forge proxy.                            |

Optional knobs:

- `NETLIFY_BLOBS_STORE` — namespace name (default `uploads`).
- `NETLIFY_SITE_ID` + `NETLIFY_BLOBS_TOKEN` — only needed when calling
  Blobs from outside a Netlify function (e.g. local CLI scripts). Inside
  functions, credentials are auto-injected.

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
  them. New uploads use Blobs.
- To backfill (re-upload existing forge content to Blobs), write a one-off
  script using `storageGet` (forge backend) → `storagePut` (blobs backend).
- The forge proxy code path is kept for local development and as a
  rollback target. Remove it once we're confident in Blobs in production.

## Limits

See https://docs.netlify.com/build/data-and-storage/netlify-blobs/ for the
full list. Most relevant:

- 5 GB max per object
- 600-byte max key length
- 2 KB max metadata per object
- Eventual consistency by default (≤60 s propagation)
