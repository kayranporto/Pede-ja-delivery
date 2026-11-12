"use strict";

function isServiceRoleKey(key) {
    if (key.startsWith("sb_secret_")) return true;

    const payload = key.split(".")[1];
    if (!payload) return false;

    try {
        return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role === "service_role";
    } catch {
        return false;
    }
}

function loadConfig(env = process.env) {
    const supabaseUrl = env.SUPABASE_URL?.trim();
    const publishableKey = (env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY)?.trim();
    const portValue = env.PORT ?? "3000";
    const port = Number(portValue);

    if (!supabaseUrl || !publishableKey) {
        throw new Error("Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY).");
    }
    if (isServiceRoleKey(publishableKey)) {
        throw new Error("A API não aceita chaves service_role; configure uma chave publishable/anon.");
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(supabaseUrl);
    } catch {
        throw new Error("SUPABASE_URL deve ser uma URL válida.");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
        throw new Error("SUPABASE_URL deve usar HTTP(S) e não pode conter credenciais.");
    }
    if (!/^\d+$/.test(String(portValue)) || !Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("PORT deve ser um número entre 1 e 65535.");
    }

    return {
        supabaseUrl: parsedUrl.origin,
        publishableKey,
        port,
        allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean),
    };
}

module.exports = loadConfig;
