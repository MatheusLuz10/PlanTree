import { api } from '../lib/apiClient'
import { nodeToRow, projectToRow } from './treeMapper'

export async function getProjectRows() {
  return api.get('/api/projects')
}

export async function createProjectRow(project) {
  return api.post('/api/projects', projectToRow(project))
}

// Cria o projeto + todos os nós descendentes numa única transação atômica no Worker.
// `nodes` são objetos no formato árvore (camelCase, com `.parentId`) — convertidos
// aqui para o formato de linha (snake_case) que a API espera, igual ao createNodeRow.
export async function seedProjectWithNodes(project, nodes) {
  return api.post('/api/seed-project', {
    project: projectToRow(project),
    nodes: nodes.map((node) => nodeToRow(node, project.id)),
  })
}

export async function updateProjectRow(projectId, updates) {
  const payload = {}
  if (updates.title !== undefined) payload.name = updates.title
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.status !== undefined) payload.status = updates.status

  return api.patch(`/api/projects/${projectId}`, payload)
}

export async function deleteProjectRow(projectId) {
  // Os nodes do projeto são removidos em cascata pelo próprio Worker.
  await api.delete(`/api/projects/${projectId}`)
}
