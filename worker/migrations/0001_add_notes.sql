-- Adiciona o campo "notes" (Observações) a projects e nodes.
-- Rodar em bancos que já existiam antes do schema.sql ganhar essa coluna
-- (schema.sql sozinho não altera tabelas já criadas via "create table if not exists").
--
-- Como aplicar:
--   Local:  npx wrangler d1 execute plantree-db --local --file=./migrations/0001_add_notes.sql
--   Remoto: npx wrangler d1 execute plantree-db --remote --file=./migrations/0001_add_notes.sql

alter table projects add column notes text not null default '';
alter table nodes add column notes text not null default '';
