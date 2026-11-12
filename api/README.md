# API Express do PedeJá

API Node.js/Express em camadas, publicada no Vercel como função serverless:

- `../backend/src/Domain`: validação e regras do domínio;
- `../backend/src/Application`: casos de uso;
- `../backend/src/Infrastructure`: HTTP/Express, configuração e adaptador Supabase;
- `../backend/test`: testes automatizados;
- `index.js`: entrada serverless do Vercel.

## Executar localmente

Requer Node.js 20 ou superior.

```powershell
Copy-Item api\.env.example api\.env
npm install
npm run api:dev
```

Preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no `api\.env`. Também é possível usar `SUPABASE_ANON_KEY`. A API usa apenas a chave pública e a view `empresas_catalogo`; não configure uma chave `service_role`.

## Endpoints iniciais

- `GET /health` — verificação de disponibilidade;
- `GET /api/v1/status` — versão da API;
- `GET /api/v1/restaurantes?limite=20&offset=0&categoria=Pizza&cidade=São Paulo` — lista paginada do catálogo público.

`limite` aceita de 1 a 50, `offset` de 0 a 10.000, `categoria` até 80 caracteres e `cidade` até 120. Os filtros são exatos. `ids` aceita até 200 UUIDs e preserva a busca de restaurantes favoritos do front-end. Respostas incluem `X-Request-Id` e `request_id`.

Configure `ALLOWED_ORIGINS` com as origens do front-end separadas por vírgula. Chamadas sem cabeçalho `Origin`, como as feitas por serviços, não dependem de CORS.

## Publicação no Vercel

O projeto deve ter `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` configuradas nas variáveis de ambiente do Vercel (Production, Preview se aplicável e Development). A função é exposta no mesmo domínio do site em `/api/v1/*`; o rewrite está em `vercel.json`. O diretório `api/` contém somente a entrada serverless para evitar expor arquivos internos como rotas.

O site em GitHub Pages continua usando a API atual do Supabase. No Vercel, somente a listagem de restaurantes passa para esta API; pedidos, autenticação e os demais endpoints continuam na API existente até serem migrados e testados.

Para executar os testes, use `npm test`.
