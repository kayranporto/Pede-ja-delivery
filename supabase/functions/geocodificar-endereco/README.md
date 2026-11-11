# Edge Function: geocodificar-endereco

## Estado de versionamento

O código desta função foi recuperado da versão ativa já publicada no projeto Supabase `wzxsjxdbxonrmlmzufpv` (versão observada: 1) e incorporado ao repositório para eliminar a divergência entre produção e controle de versão.

Esta recuperação não publica nem altera a função remota.

## Contrato

- Método: `POST`
- JWT do gateway: obrigatório (`verify_jwt = true`)
- Corpo: objeto `endereco` ou os campos de endereço diretamente.
- Campos necessários: CEP, logradouro, número, cidade e UF.
- Campo opcional: bairro.

Exemplo de corpo:

```json
{
  "endereco": {
    "cep": "00000-000",
    "logradouro": "Rua Exemplo",
    "numero": "123",
    "bairro": "Centro",
    "cidade": "Almenara",
    "uf": "MG"
  }
}
```

Em caso de sucesso, retorna latitude, longitude, nome de exibição, provedor e atribuição do OpenStreetMap. Erros de validação retornam HTTP 400; endereço não localizado retorna HTTP 404; indisponibilidade do provedor ou coordenadas inválidas retornam HTTP 502.

## Provedor e limites

O padrão é o serviço Nominatim do OpenStreetMap. O código aplica intervalo mínimo de 1,1 segundo entre consultas por instância e timeout de 8 segundos. Esse controle em memória não é um rate limit global/distribuído; múltiplas instâncias podem realizar consultas independentes.

Variáveis opcionais:
- `GEOCODING_BASE_URL`: endpoint compatível com a consulta Nominatim.
- `GEOCODING_USER_AGENT`: identificação enviada ao provedor.

O código não contém credenciais de servidor. Não registrar endereço completo, coordenadas ou dados pessoais em logs.

## Dependências

Usa o helper compartilhado `../_shared/cors.ts`. O helper atual mantém os métodos POST/OPTIONS desta função e acrescenta o cabeçalho `X-Content-Type-Options: nosniff`.

## Testes

```bash
node --test tests/geocodificar-endereco.test.js
npm test
npm run check:edge
```

A função remota permanece na versão já implantada até uma publicação explicitamente aprovada.
