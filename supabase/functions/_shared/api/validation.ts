import type { Json } from "./types.ts";

export function uuid(value: string | undefined) { return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export function bodyJson(request: Request) { return request.json().catch(() => null) as Promise<Json | null>; }

export function str(value: unknown, max = 5000) { return typeof value === "string" && value.trim().length <= max ? value.trim() : null; }

export function int(value: unknown, min = 1, max = 100) { const n = typeof value === "number" ? value : Number(value); return Number.isInteger(n) && n >= min && n <= max ? n : null; }

