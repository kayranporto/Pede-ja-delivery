"use strict";

// Atualiza somente a URL principal e acrescenta os destinos exatos do Auth,
// preservando os demais destinos e configurações do Auth.
const projectRef = process.env.PROJECT_REF || "wzxsjxdbxonrmlmzufpv";
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const siteUrl = "https://site-delivery-42.vercel.app/";
const recoveryRedirectUrls = [
    `${siteUrl}html/nova-senha.html`,
    "https://kayranporto.github.io/Pede-ja-delivery/html/nova-senha.html"
];
const adminInviteRedirectUrls = [
    `${siteUrl}html/admin.html`,
    "https://kayranporto.github.io/Pede-ja-delivery/html/admin.html"
];
const authRedirectUrls = [...recoveryRedirectUrls, ...adminInviteRedirectUrls];
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
    const missingRedirects = authRedirectUrls.filter((url) => !allowList.includes(url));
    const nextAllowList = [...allowList, ...missingRedirects];
    const patch = {};

    if (before.site_url !== siteUrl) patch.site_url = siteUrl;
    if (missingRedirects.length) patch.uri_allow_list = nextAllowList.join(",");

    if (Object.keys(patch).length) await request("PATCH", patch);

    const after = await request("GET");
    const finalAllowList = parseAllowList(after.uri_allow_list);
    const recoveryRedirectsAllowed = recoveryRedirectUrls.every((url) => finalAllowList.includes(url));
    const adminInviteRedirectsAllowed = adminInviteRedirectUrls.every((url) => finalAllowList.includes(url));
    const verified = after.site_url === siteUrl && recoveryRedirectsAllowed && adminInviteRedirectsAllowed;
    if (!verified) {
        throw new Error("A verificação da URL principal ou dos redirects do Auth falhou.");
    }

    console.log(JSON.stringify({
        site_url: after.site_url,
        recovery_redirects_allowed: recoveryRedirectsStatus(finalAllowList),
        admin_invite_redirects_allowed: adminInviteRedirectsStatus(finalAllowList)
    }, null, 2));
    console.log("URLs de produção e compatibilidade confirmadas no Supabase Auth.");
}

function recoveryRedirectsStatus(allowList) {
    return Object.fromEntries(recoveryRedirectUrls.map((url) => [url, allowList.includes(url)]));
}

function adminInviteRedirectsStatus(allowList) {
    return Object.fromEntries(adminInviteRedirectUrls.map((url) => [url, allowList.includes(url)]));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
