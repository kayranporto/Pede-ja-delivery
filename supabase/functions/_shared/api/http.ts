import type { Json } from "./types.ts";

export const API_VERSION = "3.0.0";
export const METHODS = ["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

export function cors(request: Request) {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("SITE_URL") || "")
    .split(",").map((v: string) => v.trim().replace(/\/$/, "")).filter(Boolean);
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
  const allowed = new Set([
    ...configured,
    "https://kayranporto.github.io",
    "https://site-delivery-42.vercel.app",
  ]);
  return {
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : (configured.length === 0 ? "*" : ""),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": METHODS.join(", "),
    "Vary": "Origin",
  };
}

export function response(request: Request, body: Json | null, status = 200, cache = "no-store") {
  const id = request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
  return new Response(request.method === "HEAD" ? null : JSON.stringify(body ? { ...body, request_id: id } : null), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, "X-API-Version": API_VERSION, "X-Request-Id": id, "X-Content-Type-Options": "nosniff" },
  });
}

export function error(request: Request, status: number, code: string, message: string, details?: unknown) { return response(request, { error: { code, message, ...(details === undefined ? {} : { details }) } }, status); }

export function pathOf(request: Request) { const p = new URL(request.url).pathname.replace(/\/+$/, "") || "/"; const marker = "/api-completa"; const i = p.indexOf(marker); return i >= 0 ? (p.slice(i + marker.length) || "/") : p; }

