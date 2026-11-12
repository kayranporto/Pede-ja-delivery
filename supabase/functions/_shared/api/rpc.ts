import type { SupabaseClient } from "supabase";
import type { Json } from "./types.ts";
import { error, response } from "./http.ts";

export async function rpc(db: SupabaseClient, request: Request, name: string, args: Json = {}) { const { data, error: dbError } = await db.rpc(name, args); if (dbError) { console.error("RPC failure", { name, code: dbError.code }); return error(request, 400, "operacao_recusada", dbError.message || "A operação não pôde ser concluída."); } return response(request, { data }); }
