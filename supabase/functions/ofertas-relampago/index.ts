import { createClient } from "supabase";

function cors(request: Request) {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("SITE_URL") || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const origin = request.headers.get("origin")?.replace(/\/$/, "") || "";
  const allowed = new Set([
    ...configured,
    "https://kayranporto.github.io",
    "https://site-delivery-42.vercel.app",
  ]);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  else if (configured.length === 0) headers["Access-Control-Allow-Origin"] = "*";
  return headers;
}

function respond(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function moneyBenefit(coupon: Record<string, any>) {
  const value = Number(coupon.valor || 0);
  if (coupon.tipo === "frete") return "Frete grátis";
  if (coupon.tipo === "percentual") return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "% OFF";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + " OFF";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(request) });
  }
  if (request.method !== "GET" && request.method !== "POST") {
    return respond(request, { error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) {
      return respond(request, { error: "Vitrine de ofertas temporariamente indisponível." }, 503);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const now = new Date().toISOString();
    const { data: coupons, error: couponError } = await admin
      .from("cupons")
      .select("id,codigo,empresa_id,tipo,valor,pedido_minimo,max_desconto,limite_usos,usos,relampago,titulo_relampago,descricao_relampago,inicio,fim,primeiro_pedido")
      .eq("relampago", true)
      .eq("ativo", true)
      .lte("inicio", now)
      .gt("fim", now)
      .order("fim", { ascending: true })
      .limit(80);

    if (couponError) {
      console.error("Falha ao consultar ofertas relâmpago", couponError.message);
      return respond(request, { error: "Não foi possível carregar as ofertas agora." }, 502);
    }

    const validCoupons = (coupons || []).filter((coupon: Record<string, any>) => {
      const limit = Number(coupon.limite_usos);
      const used = Number(coupon.usos || 0);
      return coupon.empresa_id && Number.isFinite(limit) && limit > used && coupon.fim && coupon.inicio;
    });
    const ids = [...new Set(validCoupons.map((coupon: Record<string, any>) => String(coupon.empresa_id)))];
    if (!ids.length) return respond(request, { data: [] });

    const { data: businesses, error: businessesError } = await admin
      .from("empresas")
      .select("id,nome,logo,banner,status,publicado,cidade_atendimento,uf_atendimento,excluida_em")
      .in("id", ids)
      .eq("status", true)
      .eq("publicado", true)
      .is("excluida_em", null);

    if (businessesError) {
      console.error("Falha ao consultar restaurantes das ofertas", businessesError.message);
      return respond(request, { error: "Não foi possível carregar as ofertas agora." }, 502);
    }

    const businessMap = new Map((businesses || []).map((business: Record<string, any>) => [String(business.id), business]));
    const data = validCoupons
      .map((coupon: Record<string, any>) => {
        const business = businessMap.get(String(coupon.empresa_id));
        if (!business) return null;
        const total = Number(coupon.limite_usos);
        const used = Number(coupon.usos || 0);
        return {
          id: coupon.id,
          codigo: coupon.codigo,
          titulo: coupon.titulo_relampago,
          descricao: coupon.descricao_relampago || "",
          tipo: coupon.tipo,
          valor: Number(coupon.valor || 0),
          pedido_minimo: Number(coupon.pedido_minimo || 0),
          max_desconto: coupon.max_desconto === null ? null : Number(coupon.max_desconto),
          primeiro_pedido: coupon.primeiro_pedido === true,
          usos_restantes: Math.max(0, total - used),
          usos_limite: total,
          inicio: coupon.inicio,
          fim: coupon.fim,
          beneficio: moneyBenefit(coupon),
          restaurante: {
            id: String(business.id),
            nome: String(business.nome || "Restaurante"),
            logo: business.logo || null,
            banner: business.banner || null,
            cidade: business.cidade_atendimento || null,
            uf: business.uf_atendimento || null,
          },
        };
      })
      .filter(Boolean)
      .slice(0, 24);

    return respond(request, { data });
  } catch (error) {
    console.error("Erro na vitrine de ofertas relâmpago", error);
    return respond(request, { error: "Não foi possível carregar as ofertas agora." }, 500);
  }
});
