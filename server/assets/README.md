# `server/assets/`

Static assets bundled into the Netlify server function. The directory is
included automatically because `netlify.toml` declares
`included_files = ["server/**"]`.

## `cathedral-blueprint.pdf`

The PDF delivered to anyone who submits the **Get the Cathedral Blueprint**
form on the landing page (`client/src/pages/Home.tsx`, section id `#blueprint`).
The lead-capture flow lives in [`server/routers/leads.ts`](../routers/leads.ts)
and the email itself in [`server/_core/blueprintEmail.ts`](../_core/blueprintEmail.ts).

### To replace with the real blueprint

Drop the production PDF in place of this file (same path, same filename) and
redeploy. No code changes required.

```bash
cp ~/Downloads/UnifyOne-Cathedral-Blueprint.pdf server/assets/cathedral-blueprint.pdf
git add server/assets/cathedral-blueprint.pdf
git commit -m "chore(blueprint): swap placeholder PDF for real Cathedral Blueprint"
git push
```

### To regenerate the current placeholder

```bash
node scripts/generate-blueprint-placeholder.mjs
```

### Alternative: host the PDF externally

If the file is too large to comfortably bundle (>2 MB) or you want to update
it without redeploying, host it on S3 / R2 / a CDN and set the
`BLUEPRINT_DOWNLOAD_URL` environment variable. When set, the email links to
that URL instead of attaching the PDF.
