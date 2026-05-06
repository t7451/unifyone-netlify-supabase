import type { Context } from "@netlify/edge-functions";

export default async function handler(request: Request, context: Context) {
  if (request.method !== "POST") {
    return context.next();
  }

  const ip = context.ip || request.headers.get("x-forwarded-for") || "unknown";
  const url = new URL(request.url);
  const rateLimitKey = `rl:auth:${ip}:${url.pathname}`;

  void rateLimitKey;

  const response = await context.next();
  response.headers.set("X-RateLimit-Policy", "10;w=900");
  return response;
}

export const config = {
  path: ["/api/auth/*", "/api/oauth/*"],
};
