-- Adiciona o campo "conteudo" (o que precisa ser estudado, aprendido,
-- produzido ou executado em cada item) a projects e nodes.
-- Rodar em bancos que já existiam antes do schema.sql ganhar essa coluna
-- (schema.sql sozinho não altera tabelas já criadas via "create table if not exists").
--
-- Como aplicar:
--   Local:  npx wrangler d1 execute plantree-db --local --file=./migrations/0002_add_conteudo.sql
--   Remoto: npx wrangler d1 execute plantree-db --remote --file=./migrations/0002_add_conteudo.sql

alter table projects add column conteudo text not null default '';
alter table nodes add column conteudo text not null default '';
