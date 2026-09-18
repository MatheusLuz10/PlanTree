// Worker do PlanTree: expõe uma API REST simples sobre o D1 para as tabelas
// "projects" e "nodes". Sem autenticação por enquanto — todo o acesso é
// aberto (CORS liberado). A árvore em si (regras de hierarquia, progresso)
// continua vivendo inteiramente no frontend; este Worker só persiste linhas.

function corsHeaders(request) {
  const origin = request.headers.get('Origin') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(request, data, status = 200) {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  })
}

function error(request, message, status = 400) {
  return json(request, { error: message }, status)
}

function nowIso() {
  return new Date().toISOString()
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

async function listProjects(env, request) {
  const { results } = await env.DB.prepare('SELECT * FROM projects ORDER BY created_at ASC').all()
  return json(request, results)
}

async function createProject(env, request) {
  const body = await readJson(request)
  if (!body.id || !body.name) return error(request, 'id e name são obrigatórios')

  const now = nowIso()
  const row = {
    id: body.id,
    name: body.name,
    description: body.description ?? '',
    notes: body.notes ?? '',
    conteudo: body.conteudo ?? '',
    status: body.status ?? 'pending',
    created_at: now,
    updated_at: now,
  }

  await env.DB.prepare(
    'INSERT INTO projects (id, name, description, notes, conteudo, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
  )
    .bind(row.id, row.name, row.description, row.notes, row.conteudo, row.status, row.created_at, row.updated_at)
    .run()

  return json(request, row, 201)
}

// Cria um projeto + vários nós descendentes numa única transação atômica.
// Usado para "criar projeto de exemplo" e para "duplicar" uma subárvore.
async function seedProject(env, request) {
  const body = await readJson(request)
  if (!body.project?.id || !body.project?.name) return error(request, 'project.id e project.name são obrigatórios')

  const now = nowIso()
  const project = {
    id: body.project.id,
    name: body.project.name,
    description: body.project.description ?? '',
    notes: body.project.notes ?? '',
    conteudo: body.project.conteudo ?? '',
    status: body.project.status ?? 'pending',
    created_at: now,
    updated_at: now,
  }

  const statements = [
    env.DB.prepare(
      'INSERT INTO projects (id, name, description, notes, conteudo, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    ).bind(
      project.id,
      project.name,
      project.description,
      project.notes,
      project.conteudo,
      project.status,
      project.created_at,
      project.updated_at,
    ),
  ]

  for (const node of body.nodes ?? []) {
    statements.push(
      env.DB.prepare(
        'INSERT INTO nodes (id, project_id, parent_id, title, description, notes, conteudo, type, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      ).bind(
        node.id,
        project.id,
        node.parent_id ?? null,
        node.title,
        node.description ?? '',
        node.notes ?? '',
        node.conteudo ?? '',
        node.type,
        node.status ?? 'pending',
        now,
        now,
      ),
    )
  }

  await env.DB.batch(statements)
  return json(request, project, 201)
}

async function updateProject(env, request, id) {
  const body = await readJson(request)
  const fields = []
  const values = []

  if (body.name !== undefined) {
    fields.push('name = ?')
    values.push(body.name)
  }
  if (body.description !== undefined) {
    fields.push('description = ?')
    values.push(body.description)
  }
  if (body.notes !== undefined) {
    fields.push('notes = ?')
    values.push(body.notes)
  }
  if (body.conteudo !== undefined) {
    fields.push('conteudo = ?')
    values.push(body.conteudo)
  }
  if (body.status !== undefined) {
    fields.push('status = ?')
    values.push(body.status)
  }
  fields.push('updated_at = ?')
  values.push(nowIso())

  const stmt = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
  await env.DB.prepare(stmt).bind(...values, id).run()

  const row = await env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first()
  if (!row) return error(request, 'Projeto não encontrado', 404)
  return json(request, row)
}

async function deleteProject(env, request, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM nodes WHERE project_id = ?').bind(id),
    env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id),
  ])
  return json(request, undefined, 204)
}

// ---------------------------------------------------------------------------
// nodes
// ---------------------------------------------------------------------------

async function listNodes(env, request, projectId) {
  const { results } = await env.DB.prepare('SELECT * FROM nodes WHERE project_id = ?').bind(projectId).all()
  return json(request, results)
}

async function createNode(env, request) {
  const body = await readJson(request)
  if (!body.id || !body.project_id || !body.title || !body.type) {
    return error(request, 'id, project_id, title e type são obrigatórios')
  }

  // Integridade: o pai (quando existir) precisa pertencer ao mesmo projeto.
  if (body.parent_id) {
    const parent = await env.DB.prepare('SELECT project_id FROM nodes WHERE id = ?').bind(body.parent_id).first()
    if (!parent) return error(request, 'parent_id não encontrado')
    if (parent.project_id !== body.project_id) return error(request, 'parent_id pertence a outro projeto')
  }

  const now = nowIso()
  const row = {
    id: body.id,
    project_id: body.project_id,
    parent_id: body.parent_id ?? null,
    title: body.title,
    description: body.description ?? '',
    notes: body.notes ?? '',
    conteudo: body.conteudo ?? '',
    type: body.type,
    status: body.status ?? 'pending',
    created_at: now,
    updated_at: now,
  }

  await env.DB.prepare(
    'INSERT INTO nodes (id, project_id, parent_id, title, description, notes, conteudo, type, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  )
    .bind(
      row.id,
      row.project_id,
      row.parent_id,
      row.title,
      row.description,
      row.notes,
      row.conteudo,
      row.type,
      row.status,
      row.created_at,
      row.updated_at,
    )
    .run()

  return json(request, row, 201)
}

async function updateNode(env, request, id) {
  const body = await readJson(request)
  const existing = await env.DB.prepare('SELECT * FROM nodes WHERE id = ?').bind(id).first()
  if (!existing) return error(request, 'Node não encontrado', 404)

  // Integridade: se está mudando de pai (mover), o novo pai precisa ser do mesmo projeto.
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await env.DB.prepare('SELECT project_id FROM nodes WHERE id = ?').bind(body.parent_id).first()
    if (!parent) return error(request, 'parent_id não encontrado')
    if (parent.project_id !== existing.project_id) return error(request, 'parent_id pertence a outro projeto')
  }

  const fields = []
  const values = []
  for (const key of ['title', 'description', 'notes', 'conteudo', 'status', 'parent_id']) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(body[key])
    }
  }
  fields.push('updated_at = ?')
  values.push(nowIso())

  const stmt = `UPDATE nodes SET ${fields.join(', ')} WHERE id = ?`
  await env.DB.prepare(stmt).bind(...values, id).run()

  const row = await env.DB.prepare('SELECT * FROM nodes WHERE id = ?').bind(id).first()
  return json(request, row)
}

// Exclui o node e toda a subárvore abaixo dele numa única query recursiva
// (não depende de ON DELETE CASCADE do D1 — mais previsível e portátil).
async function deleteNode(env, request, id) {
  await env.DB.prepare(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM nodes WHERE id = ?
       UNION ALL
       SELECT n.id FROM nodes n JOIN descendants d ON n.parent_id = d.id
     )
     DELETE FROM nodes WHERE id IN (SELECT id FROM descendants)`,
  )
    .bind(id)
    .run()

  return json(request, undefined, 204)
}

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean) // ['api', 'projects', ':id', ...]

    try {
      if (parts[0] !== 'api') return error(request, 'Not found', 404)

      if (parts[1] === 'projects') {
        if (parts.length === 2) {
          if (request.method === 'GET') return await listProjects(env, request)
          if (request.method === 'POST') return await createProject(env, request)
        }
        if (parts.length === 3) {
          const id = parts[2]
          if (request.method === 'PATCH') return await updateProject(env, request, id)
          if (request.method === 'DELETE') return await deleteProject(env, request, id)
        }
      }

      if (parts[1] === 'seed-project' && parts.length === 2 && request.method === 'POST') {
        return await seedProject(env, request)
      }

      if (parts[1] === 'nodes') {
        if (parts.length === 2) {
          if (request.method === 'GET') {
            const projectId = url.searchParams.get('project_id')
            if (!projectId) return error(request, 'project_id é obrigatório')
            return await listNodes(env, request, projectId)
          }
          if (request.method === 'POST') return await createNode(env, request)
        }
        if (parts.length === 3) {
          const id = parts[2]
          if (request.method === 'PATCH') return await updateNode(env, request, id)
          if (request.method === 'DELETE') return await deleteNode(env, request, id)
        }
      }

      return error(request, 'Not found', 404)
    } catch (err) {
      console.error(err)
      return error(request, 'Erro interno', 500)
    }
  },
}
