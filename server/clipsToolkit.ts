/**
 * server/clipsToolkit.ts
 *
 * Standalone instant-delivery product: 1Commerce GenAI Research Toolkit.
 *
 * Serves the research workbook at /api/clips-toolkit/download?token=<jwt>.
 * The token is minted by the `clipsToolkit.getDownload` tRPC procedure only
 * after the buyer's Stripe Checkout session has been verified as paid, so
 * the file cannot be downloaded by an unauthenticated visitor.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { jwtVerify, SignJWT } from "jose";

export const CLIPS_DOWNLOAD_FILENAME =
  "1Commerce_GenAI_Video_Startups_Funding_Analysis.xlsx";
export const CLIPS_DOWNLOAD_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const CLIPS_TOKEN_AUDIENCE = "clips-toolkit-download";
export const CLIPS_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes

const ASSET_PATH = path.join(
  process.cwd(),
  "server",
  "assets",
  "clips",
  "research.xlsx"
);

function getSecret(): Uint8Array {
  // Read process.env directly so the same secret is used as the rest of the
  // app's session JWTs and so secret rotation takes effect without a restart.
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required to sign download tokens");
  }
  return new TextEncoder().encode(secret);
}

export interface ClipsDownloadTokenPayload {
  sub: string; // Stripe session id
  email?: string | null;
}

export async function signClipsDownloadToken(
  payload: ClipsDownloadTokenPayload
): Promise<string> {
  return new SignJWT({ email: payload.email ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setAudience(CLIPS_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${CLIPS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyClipsDownloadToken(
  token: string
): Promise<ClipsDownloadTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    audience: CLIPS_TOKEN_AUDIENCE,
  });
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Invalid download token");
  }
  const email =
    typeof payload.email === "string" || payload.email === null
      ? (payload.email as string | null)
      : null;
  return { sub: payload.sub, email };
}

async function readResearchAsset(): Promise<Buffer> {
  return readFile(ASSET_PATH);
}

function attachmentHeader(filename: string): string {
  return `attachment; filename="${filename.replace(/["\\]/g, "")}"`;
}

function tokenErrorResponse(message: string, status = 401): Response {
  return Response.json({ error: message }, { status });
}

export async function buildClipsDownloadResponse(
  token: string | null
): Promise<Response> {
  if (!token) {
    return tokenErrorResponse("Missing download token");
  }
  try {
    await verifyClipsDownloadToken(token);
  } catch {
    return tokenErrorResponse("Invalid or expired download token", 403);
  }

  let body: Buffer;
  try {
    body = await readResearchAsset();
  } catch (error) {
    console.error("[clipsToolkit] Failed to read research asset:", error);
    return Response.json(
      { error: "Research asset unavailable" },
      { status: 500 }
    );
  }

  // Pass an ArrayBuffer slice — accepted as BodyInit by the standard
  // Response constructor across both Node and Netlify fetch adapters.
  const arrayBuffer = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength
  ) as ArrayBuffer;
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": CLIPS_DOWNLOAD_CONTENT_TYPE,
      "Content-Disposition": attachmentHeader(CLIPS_DOWNLOAD_FILENAME),
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function registerClipsToolkitFetchRoutes(
  req: Request
): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== "/api/clips-toolkit/download") return null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  return buildClipsDownloadResponse(url.searchParams.get("token"));
}

export function registerClipsToolkitRoutes(app: Express) {
  app.get(
    "/api/clips-toolkit/download",
    async (req: ExpressRequest, res: ExpressResponse) => {
      const token =
        typeof req.query.token === "string" ? req.query.token : null;
      const response = await buildClipsDownloadResponse(token);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (
        response.headers.get("Content-Type") === CLIPS_DOWNLOAD_CONTENT_TYPE
      ) {
        const arrayBuffer = await response.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));
        return;
      }
      try {
        res.send(await response.text());
      } catch {
        res.status(500).json({ error: "Could not stream download" });
      }
    }
  );
}
