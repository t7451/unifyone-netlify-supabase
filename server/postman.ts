/**
 * server/postman.ts
 *
 * Returns a Postman v2.1 collection describing the public + auth-gated REST
 * surface of UnifyOne. Mounted from server/_core/nonTrpcRoutes.ts at
 * /api/postman/collection.json (and /api/postman/environment.json).
 *
 * Why ship this:
 *  - Developer onboarding: drop the JSON into Postman and you have every
 *    REST endpoint pre-stamped with auth headers and example payloads.
 *  - Snapshots are version-pinned so changes to UnifyOne show up in
 *    diff-able PRs of the platform's dev experience.
 *
 * The tRPC catchall (/api/trpc/*) is documented as a single folder with a
 * pointer to the typed client — Postman is poor at exploring tRPC's
 * batched/superjson envelope, so this collection sticks to canonical REST
 * routes the user can hit directly.
 */

interface PostmanRequest {
  name: string;
  request: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    header: {
      key: string;
      value: string;
      type?: string;
      description?: string;
    }[];
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: { key: string; value: string }[];
    };
    body?: {
      mode: "raw" | "formdata";
      raw?: string;
      formdata?: { key: string; type: string; value?: string }[];
      options?: { raw?: { language: string } };
    };
    description?: string;
  };
}

interface PostmanFolder {
  name: string;
  description?: string;
  item: (PostmanRequest | PostmanFolder)[];
}

function jsonHeader() {
  return {
    key: "Content-Type",
    value: "application/json",
    type: "text",
  };
}

function bearerHeader() {
  return {
    key: "Authorization",
    value: "Bearer {{api_key}}",
    type: "text",
    description:
      "uo_live_*** or uo_test_*** API key. Generate from Settings -> Developer.",
  };
}

function adminKeyHeader() {
  return {
    key: "x-admin-key",
    value: "{{admin_api_key}}",
    type: "text",
    description:
      "Server-side ADMIN_API_KEY env var. Required for /api/admin/*.",
  };
}

function buildUrl(path: string, query?: { key: string; value: string }[]) {
  const segments = path.split("/").filter(Boolean);
  return {
    raw:
      "{{base_url}}/" +
      segments.join("/") +
      (query?.length
        ? "?" + query.map(q => `${q.key}=${q.value}`).join("&")
        : ""),
    host: ["{{base_url}}"],
    path: segments,
    ...(query ? { query } : {}),
  };
}

function buildCollection(): unknown {
  const folders: PostmanFolder[] = [
    {
      name: "Health & Status",
      description: "Public introspection endpoints.",
      item: [
        {
          name: "GET /api/health",
          request: {
            method: "GET",
            header: [],
            url: buildUrl("/api/health"),
            description:
              "Returns dependency-pinged health (db / stripe / resend / redis) plus version + env. Public.",
          },
        },
      ],
    },
    {
      name: "Auth",
      description:
        "Email + scrypt password auth. Sets the app_session_id cookie on success.",
      item: [
        {
          name: "POST /api/auth/signup",
          request: {
            method: "POST",
            header: [jsonHeader()],
            url: buildUrl("/api/auth/signup"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  email: "you@example.com",
                  password: "minimum-8-chars",
                  name: "Your Name",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/auth/signin",
          request: {
            method: "POST",
            header: [jsonHeader()],
            url: buildUrl("/api/auth/signin"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { identifier: "you@example.com", password: "yyyyyyyy" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/auth/logout",
          request: {
            method: "POST",
            header: [jsonHeader()],
            url: buildUrl("/api/auth/logout"),
          },
        },
        {
          name: "POST /api/auth/delete-account",
          request: {
            method: "POST",
            header: [jsonHeader()],
            url: buildUrl("/api/auth/delete-account"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  confirmEmail: "you@example.com",
                  currentPassword: "yyyyyyyy",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            description:
              "GDPR Article 17 / CCPA right-to-delete. Requires email + password confirmation. Sets users.deletedAt and bumps passwordChangedAt to invalidate sessions.",
          },
        },
      ],
    },
    {
      name: "Payments",
      description:
        "Stripe / PayPal / Square checkout creation + webhooks. Webhooks are receiver-only.",
      item: [
        {
          name: "POST /api/stripe/checkout",
          request: {
            method: "POST",
            header: [jsonHeader(), bearerHeader()],
            url: buildUrl("/api/stripe/checkout"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { planSlug: "pro", billingCycle: "monthly" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/stripe/webhook (receiver)",
          request: {
            method: "POST",
            header: [
              jsonHeader(),
              {
                key: "Stripe-Signature",
                value: "<provided by Stripe>",
                type: "text",
              },
            ],
            url: buildUrl("/api/stripe/webhook"),
            description:
              "Stripe webhook receiver. Verifies signature against STRIPE_WEBHOOK_SECRET. Idempotent on stripe_webhook_events.event_id.",
          },
        },
        {
          name: "POST /api/paypal/create-order",
          request: {
            method: "POST",
            header: [jsonHeader(), bearerHeader()],
            url: buildUrl("/api/paypal/create-order"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  amount: 19.99,
                  currency: "USD",
                  description: "UnifyOne credits",
                  returnUrl: "{{base_url}}/checkout/success",
                  cancelUrl: "{{base_url}}/checkout/cancel",
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/paypal/capture-order",
          request: {
            method: "POST",
            header: [jsonHeader(), bearerHeader()],
            url: buildUrl("/api/paypal/capture-order"),
            body: {
              mode: "raw",
              raw: JSON.stringify({ paypalOrderId: "EC-..." }, null, 2),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/paypal/webhook (receiver)",
          request: {
            method: "POST",
            header: [
              jsonHeader(),
              {
                key: "PAYPAL-TRANSMISSION-ID",
                value: "<provided by PayPal>",
                type: "text",
              },
            ],
            url: buildUrl("/api/paypal/webhook"),
            description:
              "PayPal webhook receiver. Verifies via PayPal's verify-webhook-signature endpoint with PAYPAL_WEBHOOK_ID env var.",
          },
        },
        {
          name: "POST /api/square/create-checkout",
          request: {
            method: "POST",
            header: [jsonHeader(), bearerHeader()],
            url: buildUrl("/api/square/create-checkout"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { amountMinor: 1999, currency: "USD" },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/square/webhook (receiver)",
          request: {
            method: "POST",
            header: [
              jsonHeader(),
              {
                key: "x-square-hmacsha256-signature",
                value: "<provided by Square>",
                type: "text",
              },
            ],
            url: buildUrl("/api/square/webhook"),
            description:
              "Square webhook receiver. HMAC-SHA256 over (notification_url + raw body).",
          },
        },
      ],
    },
    {
      name: "Shopify",
      description:
        "OAuth install + webhook receiver. Mounted via /api/shopify/* (CR4).",
      item: [
        {
          name: "GET /api/shopify/install?shop=...",
          request: {
            method: "GET",
            header: [],
            url: buildUrl("/api/shopify/install", [
              { key: "shop", value: "yourstore.myshopify.com" },
            ]),
            description:
              "OAuth init. Redirects to Shopify with state cookie set.",
          },
        },
        {
          name: "POST /api/shopify/webhook (receiver)",
          request: {
            method: "POST",
            header: [
              jsonHeader(),
              {
                key: "X-Shopify-Hmac-Sha256",
                value: "<provided by Shopify>",
                type: "text",
              },
              {
                key: "X-Shopify-Topic",
                value: "orders/create",
                type: "text",
              },
              {
                key: "X-Shopify-Shop-Domain",
                value: "yourstore.myshopify.com",
                type: "text",
              },
            ],
            url: buildUrl("/api/shopify/webhook"),
            description:
              "Shopify webhook receiver. HMAC-SHA256 base64 timing-safe compare against SHOPIFY_API_SECRET. Topic-to-entity map covers orders, products, customers, inventory, fulfillments.",
          },
        },
      ],
    },
    {
      name: "Uploads",
      description: "Image storage via Netlify Blobs.",
      item: [
        {
          name: "POST /api/uploads/image",
          request: {
            method: "POST",
            header: [bearerHeader()],
            url: buildUrl("/api/uploads/image"),
            body: {
              mode: "formdata",
              formdata: [{ key: "file", type: "file" }],
            },
            description:
              "Multipart form data with a 'file' field. image/* only, max 5MB. Returns { url, key }.",
          },
        },
        {
          name: "GET /api/uploads/image/:key",
          request: {
            method: "GET",
            header: [],
            url: buildUrl("/api/uploads/image/:key"),
            description:
              "Re-serves a stored blob. Cache-Control: immutable, max-age=1y.",
          },
        },
      ],
    },
    {
      name: "Affiliate Tracking",
      description: "Impact.com S2S click capture + conversion fire.",
      item: [
        {
          name: "GET /api/impact/click",
          request: {
            method: "GET",
            header: [],
            url: buildUrl("/api/impact/click", [
              { key: "im_click_id", value: "abc123" },
            ]),
            description: "Public click capture. Sets im_click_id cookie.",
          },
        },
      ],
    },
    {
      name: "Admin",
      description:
        "Admin-key gated operational endpoints. Set ADMIN_API_KEY env var on Netlify and pass via x-admin-key header.",
      item: [
        {
          name: "POST /api/admin/recover-subscription",
          request: {
            method: "POST",
            header: [jsonHeader(), adminKeyHeader()],
            url: buildUrl("/api/admin/recover-subscription"),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                { tenantId: 0, stripeCustomerId: "cus_..." },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
          },
        },
        {
          name: "POST /api/admin/setup-products",
          request: {
            method: "POST",
            header: [jsonHeader(), adminKeyHeader()],
            url: buildUrl("/api/admin/setup-products"),
          },
        },
      ],
    },
    {
      name: "tRPC",
      description:
        "All tRPC procedures hang off /api/trpc/<router>.<procedure>. Use the typed client from packages/api in TypeScript projects rather than calling raw — Postman is awkward with tRPC's batched/superjson envelope. This single example shows the shape if you must.",
      item: [
        {
          name: "POST /api/trpc/customers.create (example)",
          request: {
            method: "POST",
            header: [jsonHeader(), bearerHeader()],
            url: buildUrl("/api/trpc/customers.create", [
              { key: "batch", value: "1" },
            ]),
            body: {
              mode: "raw",
              raw: JSON.stringify(
                {
                  "0": {
                    json: {
                      email: "customer@example.com",
                      firstName: "Jane",
                    },
                  },
                },
                null,
                2
              ),
              options: { raw: { language: "json" } },
            },
            description:
              "tRPC HTTP envelope: keys are batch indices ('0', '1', ...), value is { json: <input> } (or { json, meta } for superjson types like Date / BigInt).",
          },
        },
      ],
    },
  ];

  return {
    info: {
      name: "UnifyOne — REST API",
      description:
        "Auto-generated Postman collection for UnifyOne / 1commerce.online. Set the {{base_url}} environment variable to https://1commerce.online (or http://localhost:3000 for dev), and {{api_key}} to a uo_live_*** / uo_test_*** key generated from Settings -> Developer.",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      _postman_id: "ee06aa3e-4d40-4b48-8e9f-b1a8a8a8a8a8",
    },
    item: folders,
    variable: [
      {
        key: "base_url",
        value: "https://1commerce.online",
        description:
          "https://1commerce.online for production, http://localhost:3000 for local Express, http://localhost:8888 for local netlify dev.",
      },
      {
        key: "api_key",
        value: "",
        description:
          "uo_live_*** or uo_test_*** — generate from /settings/developer.",
      },
      {
        key: "admin_api_key",
        value: "",
        description:
          "Server-side ADMIN_API_KEY env value — only required for /api/admin/* routes.",
      },
    ],
  };
}

function buildEnvironment(env: "production" | "local"): unknown {
  return {
    name: env === "production" ? "UnifyOne — Production" : "UnifyOne — Local",
    values: [
      {
        key: "base_url",
        value:
          env === "production"
            ? "https://1commerce.online"
            : "http://localhost:8888",
        type: "default",
        enabled: true,
      },
      { key: "api_key", value: "", type: "secret", enabled: true },
      { key: "admin_api_key", value: "", type: "secret", enabled: true },
    ],
    _postman_variable_scope: "environment",
  };
}

export async function registerPostmanFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/postman/collection.json" && req.method === "GET") {
    return Response.json(buildCollection(), {
      headers: {
        "Content-Disposition":
          'inline; filename="unifyone-rest.postman_collection.json"',
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (path === "/api/postman/environment.json" && req.method === "GET") {
    const env =
      url.searchParams.get("env") === "local" ? "local" : "production";
    return Response.json(buildEnvironment(env), {
      headers: {
        "Content-Disposition": `inline; filename="unifyone-${env}.postman_environment.json"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return null;
}
