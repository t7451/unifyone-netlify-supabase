import { logger } from "../lib/logger.js";

// Thin Search Console (Webmasters v3) client. Service-account auth via a
// base64'd JSON key in GSC_SERVICE_ACCOUNT_JSON. We avoid a hard dep on
// `googleapis` (heavy, drags in too many transitive packages) and call the
// API directly with a self-signed JWT. That keeps the worker container small
// and the Netlify function bundles under their cold-start budget.

const GSC_API_BASE = "https://searchconsole.googleapis.com";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GscDimension = "query" | "page" | "country" | "device" | "date";

export type GscRow = {
  keys: string[]; // aligned 1:1 with the dimensions array passed to query()
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscClient = {
  queryAnalytics(args: {
    siteUrl: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    dimensions: GscDimension[];
    rowLimit?: number;
  }): Promise<GscRow[]>;
};

export function createGscClient(options: {
  /** Base64-encoded service-account JSON. From GSC_SERVICE_ACCOUNT_JSON env. */
  serviceAccountJsonBase64: string;
}): GscClient {
  const credentials = parseServiceAccountJson(options.serviceAccountJsonBase64);
  let cachedToken: { access_token: string; expires_at: number } | null = null;

  async function getAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
      return cachedToken.access_token;
    }
    const jwt = await signServiceAccountJwt(credentials);
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `GSC token exchange failed: ${res.status} ${text.slice(0, 300)}`
      );
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    cachedToken = {
      access_token: json.access_token,
      expires_at: Date.now() + json.expires_in * 1000,
    };
    return json.access_token;
  }

  async function queryAnalytics(args: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions: GscDimension[];
    rowLimit?: number;
  }): Promise<GscRow[]> {
    const totalLimit = args.rowLimit ?? 25_000;
    const pageSize = Math.min(25_000, totalLimit);
    const all: GscRow[] = [];

    let startRow = 0;
    let attempt = 0;
    while (all.length < totalLimit) {
      const token = await getAccessToken();
      const remaining = totalLimit - all.length;
      const requestRows = Math.min(pageSize, remaining);

      const url =
        `${GSC_API_BASE}/webmasters/v3/sites/` +
        encodeURIComponent(args.siteUrl) +
        `/searchAnalytics/query`;

      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startDate: args.startDate,
            endDate: args.endDate,
            dimensions: args.dimensions,
            rowLimit: requestRows,
            startRow,
          }),
        });
      } catch (err) {
        attempt += 1;
        if (attempt >= 4) throw err;
        await sleep(2 ** attempt * 500);
        continue;
      }

      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        attempt += 1;
        if (attempt >= 4) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `GSC query gave up after retries: ${res.status} ${text.slice(0, 300)}`
          );
        }
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(Math.max(retryAfter * 1000, 2 ** attempt * 500));
        continue;
      }
      attempt = 0;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GSC HTTP ${res.status}: ${text.slice(0, 500)}`);
      }

      const json = (await res.json()) as { rows?: GscRow[] };
      const rows = json.rows ?? [];
      all.push(...rows);

      // Done when GSC returns fewer rows than we asked for.
      if (rows.length < requestRows) break;
      startRow += rows.length;
      logger.debug(
        { siteUrl: args.siteUrl, fetched: all.length },
        "GSC pagination progress"
      );
    }

    return all;
  }

  return { queryAnalytics };
}

// --- service-account JWT signing ---

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function parseServiceAccountJson(b64: string): ServiceAccountKey {
  let json: string;
  try {
    json = Buffer.from(b64, "base64").toString("utf8");
  } catch (err) {
    throw new Error(
      `GSC_SERVICE_ACCOUNT_JSON is not valid base64: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(json) as ServiceAccountKey;
  } catch (err) {
    throw new Error(
      `GSC_SERVICE_ACCOUNT_JSON is not valid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_JSON missing client_email or private_key — re-export the key from Google Cloud Console"
    );
  }
  return parsed;
}

async function signServiceAccountJwt(
  creds: ServiceAccountKey
): Promise<string> {
  const { createSign } = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64urlEncode(
    JSON.stringify({
      iss: creds.client_email,
      scope: SCOPE,
      aud: creds.token_uri ?? TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  );
  const message = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const signature = signer.sign(creds.private_key).toString("base64url");
  return `${message}.${signature}`;
}

function base64urlEncode(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
