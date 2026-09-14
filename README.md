# LABrand Forms

Formulários que fazem uma pergunta por vez. Diagnósticos, briefings e pesquisas com experiência de conversa, no padrão LABrand.

Fork do [OpenForm](https://github.com/dabit3/openform) (MIT), customizado por Claudio Gabilan: interface em português do Brasil, tema LABrand (grafite, off-white e âmbar), webhook por formulário e identidade própria.

## O que tem

- 13 tipos de pergunta: texto curto, texto longo, lista suspensa, múltipla escolha, e-mail, telefone, número, data, avaliação (1–5), escala de opinião (1–10), sim/não, upload de arquivo, URL.
- Player estilo Typeform: uma pergunta por vez, navegação por teclado (Enter, setas, scroll), barra de progresso, mobile first.
- 7 temas, sendo **LABrand** o padrão.
- Login com Google ou link mágico por e-mail (Supabase Auth).
- Painel de respostas: busca, filtro, exportação CSV.
- **Webhook por formulário**: a cada resposta, o banco envia um POST em JSON para a URL configurada (ClickMax, HubSpot, Zapier, Make, n8n…). Sem chave secreta no app.
- Upload de arquivos via Cloudflare R2 (opcional).

## Stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth + pg_net) · Tailwind CSS v4 · shadcn/ui · Framer Motion.

## Colocar pra rodar

### 1. Supabase (5 minutos)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. **Authentication → Providers → Google**: ative e cole Client ID / Client Secret do Google Cloud Console. Redirect URI no Google: `https://SEU_PROJETO.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration**: Site URL `http://localhost:3000` e redirect `http://localhost:3000/auth/callback` (depois adicione a URL de produção).
5. **Settings → API**: copie Project URL e anon key.

Se quiser só link mágico, pule o passo 3.

### 2. Rodar local

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
```

### 3. Deploy na Vercel

1. Suba o repositório no GitHub.
2. Em [vercel.com](https://vercel.com), **Add New Project → Import** o repositório.
3. Em Environment Variables, adicione as mesmas variáveis do `.env.local`.
4. Deploy. Depois, volte ao Supabase (URL Configuration) e adicione `https://SEU-DOMINIO/auth/callback`.

## Webhook

Em **Configurações** do formulário, preencha **Webhook (opcional)** com a URL de destino. Cada resposta enviada gera:

```json
{
  "event": "response.created",
  "form": { "id": "uuid", "title": "Diagnóstico de marca", "slug": "diagnostico" },
  "response": {
    "id": "uuid",
    "submitted_at": "2026-09-14T12:00:00Z",
    "answers": { "<id-da-pergunta>": "valor" },
    "answers_by_title": { "Qual é o seu e-mail?": "nome@exemplo.com" }
  }
}
```

O disparo é feito por trigger no Postgres usando `pg_net`. Para depurar, consulte a tabela `net._http_response` no SQL Editor. A coluna `webhook_url` não é legível por visitantes anônimos.

## Upload de arquivos (opcional)

Crie um bucket no Cloudflare R2, gere um token com leitura/escrita e preencha `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` e `R2_PUBLIC_URL` no `.env.local`.

## Comandos

```bash
npm run dev    # desenvolvimento
npm run build  # build de produção
npm run lint   # lint
```

## Licença

MIT. Baseado no OpenForm de [dabit3](https://github.com/dabit3).
