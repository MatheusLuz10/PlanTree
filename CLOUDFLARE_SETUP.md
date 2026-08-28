# Configurando o backend (Cloudflare Workers + D1)

O app não tem mais Supabase. O banco agora é o **Cloudflare D1**, acessado
através de um **Worker** (pasta `worker/`). Não há autenticação por
enquanto — todos os projetos ficam visíveis para quem acessar o app.

## 1. Rodar localmente (sem precisar de conta Cloudflare)

O `wrangler dev` roda o Worker e o D1 inteiramente na sua máquina.

```bash
cd worker
npm install
npm run db:apply-local   # aplica schema.sql no D1 local
npm run dev               # sobe o Worker em http://127.0.0.1:8787
```

Em outro terminal, na raiz do projeto:

```bash
cp .env.example .env      # já vem apontando para http://127.0.0.1:8787
npm install
npm run dev
```

Pronto — o app já cria/edita/move/exclui projetos e atividades de verdade
contra o D1 local. Os dados ficam salvos em `worker/.wrangler/` entre
reinicializações (não é apagado a cada `wrangler dev`).

## 2. Publicar de verdade (Cloudflare real)

Isso precisa de uma conta Cloudflare (gratuita) e não pode ser feito por
mim — só você tem acesso a ela.

```bash
cd worker
npx wrangler login                              # abre o navegador para autorizar
npx wrangler d1 create plantree-db               # cria o banco remoto de verdade
```

O comando acima imprime um `database_id` real — copie e cole em
`worker/wrangler.toml`, substituindo `local-placeholder-id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "plantree-db"
database_id = "COLE-O-ID-REAL-AQUI"
```

Aplique o schema no banco remoto e publique o Worker:

```bash
npm run db:apply-remote
npm run deploy
```

O `wrangler deploy` imprime a URL pública do Worker (algo como
`https://plantree-worker.SEU-USUARIO.workers.dev`). Configure essa URL
como `VITE_API_BASE_URL` no `.env` de produção do frontend (ou nas
variáveis de ambiente da plataforma onde você for hospedar o build do
Vite — Cloudflare Pages, Vercel, Netlify, etc.).

## 3. Sobre a falta de autenticação

Por decisão explícita, esta versão não tem login — qualquer pessoa com
acesso ao frontend vê os mesmos projetos. Se no futuro quiser reintroduzir
autenticação, o ponto de entrada é `src/hooks/useProjects.js` e os
repositórios em `src/repositories/` — o resto da árvore/dashboard não
precisa mudar.

## 4. Limitações desta versão

- **Sem sincronização em tempo real** entre abas/dispositivos abertos ao
  mesmo tempo (o Supabase Realtime não tem equivalente pronto no D1;
  precisaria de Durable Objects/WebSockets, fora do escopo atual). Para
  ver uma alteração feita em outro lugar, é preciso recarregar a página.
- **Sem RLS/isolamento por usuário** — decorrência direta de não ter
  autenticação.
