import type { SupabaseClient } from "supabase";

export type Json = Record<string, unknown>;
export type RouteContext = {
  request: Request;
  url: URL;
  path: string;
  db: SupabaseClient;
  userId: string | null;
};
