# Aplicativo Android — PedeJá

Este projeto Android usa **Trusted Web Activity (TWA)** para abrir a versão de produção do PedeJá em uma experiência de aplicativo, sem duplicar o frontend ou o backend.

- URL de produção: https://site-delivery-42.vercel.app/
- ID Android (não altere depois de publicar): `br.com.kayranporto.pedeja`
- Nome exibido: PedeJá
- `compileSdk` / `targetSdk`: 36
- Biblioteca TWA: Android Browser Helper 2.7.4

O aplicativo carrega o site hospedado. O Supabase, o catálogo, os pedidos e as telas continuam sendo os mesmos do site.

## 1. Criar a chave de upload

A chave é privada. Crie-a no seu computador e **não a envie para o GitHub como arquivo**:

```bash
keytool -genkeypair -v -keystore pedeja-upload-key.jks -alias pedeja-upload -keyalg RSA -keysize 2048 -validity 10000
```

No PowerShell, gere o valor Base64 para o segredo do GitHub:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("pedeja-upload-key.jks")) | Set-Content -NoNewline "pedeja-upload-key.base64"
```

Guarde o arquivo `.jks` e as senhas em local seguro. A mesma chave de upload deve ser preservada para futuras versões.

## 2. Configurar os segredos do GitHub

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret** e cadastre:

| Nome do segredo | Valor |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Conteúdo completo do arquivo `pedeja-upload-key.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | Senha do keystore |
| `ANDROID_KEY_ALIAS` | `pedeja-upload` |
| `ANDROID_KEY_PASSWORD` | Senha da chave |

Não coloque esses valores em arquivos versionados, no frontend ou em mensagens públicas.

## 3. Gerar o pacote AAB

Depois de cadastrar os quatro segredos:

1. Abra a aba **Actions** do GitHub.
2. Selecione **Gerar aplicativo Android (AAB)**.
3. Clique em **Run workflow**.
4. Quando o processo terminar, baixe o artefato `pedeja-android-aab`.

O arquivo gerado será `app-release.aab`. É o pacote Android assinado para enviar ao Play Console. O fluxo não publica automaticamente o app.

## 4. Verificar o domínio para abrir em tela cheia

A TWA só remove a interface do navegador quando o Android consegue confirmar que o site pertence ao aplicativo. Para isso, é obrigatório publicar o arquivo Digital Asset Links em:

`https://site-delivery-42.vercel.app/.well-known/assetlinks.json`

Depois de criar o app no Play Console e ativar o Play App Signing:

1. Abra **Play Console → Integridade do app → Assinatura do app**.
2. Copie o SHA-256 do **certificado da chave de assinatura do app** (não use o certificado da chave de upload).
3. Copie `assetlinks.template.json` para a pasta `.well-known` na raiz do site, renomeando para `assetlinks.json`.
4. Substitua o texto de exemplo pelo SHA-256 real, mantendo o ID `br.com.kayranporto.pedeja`.
5. Faça o deploy do site na Vercel e confirme que a URL acima retorna JSON válido, sem redirecionamento para uma página HTML.

Até a validação do domínio, o Android pode abrir o conteúdo com a barra do navegador. Isso é esperado e não significa que o AAB esteja corrompido.

## 5. Antes de publicar

Faça testes em um dispositivo Android com Chrome atualizado: abertura, login, recuperação de senha, carrinho, checkout, pedidos, navegação de retorno, permissões de localização e notificações. Confirme também a política de privacidade, a ficha da loja, a classificação indicativa e o formulário de Segurança dos dados do Play Console.

O app está preparado para o requisito de API 36 do Google Play vigente desde 31 de agosto de 2026. A aprovação e a publicação ainda dependem da configuração da conta Play Console, da chave de assinatura, da verificação Digital Asset Links e da análise do Google.
