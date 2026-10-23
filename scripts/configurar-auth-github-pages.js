"use strict";

// Atualiza somente a URL principal do site e acrescenta o redirect exato
// de recuperação, preservando os demais destinos e configurações do Auth.
const projectRef = process.env.PROJECT_REF || "wzxsjxdbxonrmlmzufpv";
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const siteUrl = "https://kayranporto.github.io/Pede-ja-delivery/";
const recoveryRedirectUrl = `${siteUrl}html/nova-senha.html`;
const authConfigUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

if (!accessToken) {
    console.error("Defina SUPABASE_ACCESS_TOKEN no ambiente. O token não será salvo nem exibido.");
    process.exit(1);
}

async function request(method, body) {
    const response = await fetch(authConfigUrl, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Supabase Management API respondeu HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text);
}

function parseAllowList(value) {
    if (typeof value !== "string") return [];
    return value.split(",").map((url) => url.trim()).filter(Boolean);
}

async function main() {
    const before = await request("GET");
    const allowList = parseAllowList(before.uri_allow_list);
    const hasRedirect = allowList.includes(recoveryRedirectUrl);
    const nextAllowList = hasRedirect ? allowList : [...allowList, recoveryRedirectUrl];
    const patch = {};

    if (before.site_url !== siteUrl) patch.site_url = siteUrl;
    if (!hasRedirect) patch.uri_allow_list = nextAllowList.join(",");

    if (Object.keys(patch).length) await request("PATCH", patch);

    const after = await request("GET");
    const finalAllowList = parseAllowList(after.uri_allow_list);
    const verified = after.site_url === siteUrl && finalAllowList.includes(recoveryRedirectUrl);
    if (!verified) {
        throw new Error("A verificação da URL principal ou do redirect do GitHub Pages falhou.");
    }

    console.log(JSON.stringify({
        site_url: after.site_url,
        recovery_redirect_allowed: finalAllowList.includes(recoveryRedirectUrl)
    }, null, 2));
    console.log("URLs do GitHub Pages confirmadas no Supabase Auth.");
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
