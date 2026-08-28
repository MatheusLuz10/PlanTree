import { api } from '../lib/apiClient'
import { nodeToRow, resolveDbParentId } from './treeMapper'

export async function getNodeRows(projectId) {
  return api.get(`/api/nodes?project_id=${encodeURIComponent(projectId)}`)
}

export async function createNodeRow(node, projectId) {
  return api.post('/api/nodes', nodeToRow(node, projectId))
}

export async function updateNodeRow(nodeId, updates) {
  const payload = {}
  if (updates.title !== undefined) payload.title = updates.title
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.status !== undefined) payload.status = updates.status

  return api.patch(`/api/nodes/${nodeId}`, payload)
}

export async function deleteNodeRow(nodeId) {
  // Descendentes são removidos em cascata (query recursiva) no próprio Worker.
  await api.delete(`/api/nodes/${nodeId}`)
}

export async function moveNodeRow(nodeId, newParentId, projectId) {
  return api.patch(`/api/nodes/${nodeId}`, { parent_id: resolveDbParentId(newParentId, projectId) })
}
