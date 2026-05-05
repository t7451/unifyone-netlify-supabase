/**
 * server/uploads.ts
 *
 * Image upload Fetch handler. Mounted via server/_core/nonTrpcRoutes.ts at
 * /api/uploads/*. Stores in Netlify Blobs (lazy-imported — the @netlify/blobs
 * package is provided automatically by Netlify Functions runtime).
 *
 * Endpoints:
 *   POST /api/uploads/image   multipart/form-data; field=file; max 5MB; image/* only
 *
 * Returns: { url: string, key: string } where url points back to
 *   GET /api/uploads/image/:key for re-serving.
 */
import { sdk } from "./_core/sdk";

const MAX_BYTES = 5 * 1024 * 1024;

async function loadBlobsStore() {
  try {
    const mod: { getStore?: (name: string) => unknown } = await import(
      "@netlify/blobs"
    );
    if (typeof mod.getStore !== "function") return null;
    return mod.getStore("uploads") as {
      set: (
        key: string,
        body: ArrayBuffer | Uint8Array | string,
        opts?: { metadata?: Record<string, string> }
      ) => Promise<void>;
      get: (
        key: string,
        opts?: { type?: "stream" | "arrayBuffer" | "blob" | "text" | "json" }
      ) => Promise<unknown>;
      getMetadata: (
        key: string
      ) => Promise<{ metadata?: Record<string, string> } | null>;
    };
  } catch {
    return null;
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function registerUploadFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/api/uploads/image" && req.method === "POST") {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return jsonError("Authentication required.", 401);
    }

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return jsonError(
        "Expected multipart/form-data with a 'file' field.",
        400
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err) {
      return jsonError(
        `Could not parse form data: ${
          err instanceof Error ? err.message : "unknown"
        }`,
        400
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File) && !(file instanceof Blob)) {
      return jsonError("Missing 'file' field in form data.", 400);
    }
    const fileBlob = file as File;

    if (!fileBlob.type.startsWith("image/")) {
      return jsonError(
        `Only image/* uploads are supported (got ${fileBlob.type || "unknown"}).`,
        400
      );
    }
    if (fileBlob.size > MAX_BYTES) {
      return jsonError(
        `File exceeds ${MAX_BYTES} bytes (got ${fileBlob.size}).`,
        413
      );
    }

    const store = await loadBlobsStore();
    if (!store) {
      return jsonError(
        "Netlify Blobs is not available in this environment. " +
          "Run on Netlify Functions or set up a local blob store.",
        501
      );
    }

    const ext = (fileBlob.type.split("/")[1] || "bin").replace(
      /[^a-z0-9]/gi,
      ""
    );
    const random = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    const key = `t${user.tenantId ?? 0}/u${user.id}/${Date.now()}-${random}.${ext}`;

    const arrayBuffer = await fileBlob.arrayBuffer();
    await store.set(key, arrayBuffer, {
      metadata: {
        userId: String(user.id),
        tenantId: String(user.tenantId ?? ""),
        contentType: fileBlob.type,
        originalName: (fileBlob as { name?: string }).name ?? "upload",
      },
    });

    const publicUrl = `${url.origin}/api/uploads/image/${encodeURIComponent(key)}`;
    return new Response(JSON.stringify({ url: publicUrl, key }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path.startsWith("/api/uploads/image/") && req.method === "GET") {
    const key = decodeURIComponent(path.slice("/api/uploads/image/".length));
    if (!key) return jsonError("Missing key.", 400);

    const store = await loadBlobsStore();
    if (!store) return jsonError("Netlify Blobs unavailable.", 501);

    const meta = await store.getMetadata(key);
    if (!meta) return jsonError("Not found.", 404);

    const data = (await store.get(key, {
      type: "arrayBuffer",
    })) as ArrayBuffer | null;
    if (!data) return jsonError("Not found.", 404);

    const contentType =
      meta.metadata?.contentType ?? "application/octet-stream";
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return null;
}
