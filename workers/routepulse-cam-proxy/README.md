# routepulse-cam-proxy

Cloudflare Worker that proxies traffic-camera stills for RoutePulse.

## Why

1. **Keeps the ODOT TripCheck subscription key server-side.** Camera image
   URLs can require an `Ocp-Apim-Subscription-Key` header; the worker
   injects it from a secret so the key never ships to browsers.
2. **Normalizes CORS.** Some camera hosts send no CORS headers; the worker
   replies with `Access-Control-Allow-Origin: *` so `<img>` tags always load.
3. **Edge-caches stills for 120s**, shielding ODOT/WSDOT from per-visitor
   refreshes (camera images update slower than that anyway).

## API

```
GET /img?u=<url-encoded upstream image URL>  -> proxied image (120s cache)
GET /health                                  -> {"ok":true}
```

Only allowlisted camera hosts are proxied, HTTPS only (open-proxy
prevention): `apiportal.odot.state.or.us`, `odot.state.or.us`,
`www.tripcheck.com`, `tripcheck.com`, `wsdot.wa.gov`, `www.wsdot.wa.gov`,
`images.wsdot.wa.gov`.

## Deploy

```bash
cd workers/routepulse-cam-proxy
npx wrangler deploy
npx wrangler secret put TRIPCHECK_KEY   # optional but recommended
```

Then point the web app at it — in Netlify env vars:

```
VITE_ROUTEPULSE_CAM_PROXY=https://routepulse-cam-proxy.<your-subdomain>.workers.dev
```

Redeploy the site. The RoutePulse client builds camera image URLs as
`${VITE_ROUTEPULSE_CAM_PROXY}/img?u=<encoded original url>`.

**Optional:** if `VITE_ROUTEPULSE_CAM_PROXY` is unset, the client loads
camera stills directly from their original URLs. That works for hosts
that don't require the key header, so the map layer is functional even
before this worker is deployed.
