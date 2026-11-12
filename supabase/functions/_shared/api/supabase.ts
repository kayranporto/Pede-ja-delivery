import { createClient, type SupabaseClient } from "supabase";

export function client(request: Request) { const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY"); if (!url || !key) return null; const authorization = request.headers.get("authorization") || undefined; return createClient(url, key, { global: { headers: authorization ? { Authorization: authorization } : {} }, auth: { persistSession: false, autoRefreshToken: false } }); }

export async function authUser(db: SupabaseClient) { const { data, error: e } = await db.auth.getUser(); return e || !data.user ? null : data.user; }

