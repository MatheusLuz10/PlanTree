-- Schema do D1 para o app PlanTree.
-- Sem autenticação por enquanto: não há coluna de usuário nas tabelas.
--
-- Como aplicar:
--   Local:  npx wrangler d1 execute plantree-db --local --file=./schema.sql
--   Remoto: npx wrangler d1 execute plantree-db --remote --file=./schema.sql

create table if not exists projects (
  id text primary key,
  name text not null,
  description text not null default '',
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  created_at text not null,
  updated_at text not null
);

-- Todo o conteúdo abaixo de um projeto (pastas, atividades, subatividades).
-- parent_id = null  => item de primeiro nível dentro do projeto.
create table if not exists nodes (
  id text primary key,
  project_id text not null references projects (id),
  parent_id text references nodes (id),
  title text not null,
  description text not null default '',
  notes text not null default '',
  type text not null check (type in ('folder', 'task')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  created_at text not null,
  updated_at text not null
);

create index if not exists nodes_project_id_idx on nodes (project_id);
create index if not exists nodes_parent_id_idx on nodes (parent_id);
