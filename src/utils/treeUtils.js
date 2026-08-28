export const STATUS_OPTIONS = ['pending', 'in_progress', 'completed']

export const STATUS_META = {
  pending: {
    label: 'Pendente',
    icon: '○',
    className: 'status-pending',
  },
  in_progress: {
    label: 'Em andamento',
    icon: '◐',
    className: 'status-progress',
  },
  completed: {
    label: 'Concluído',
    icon: '✓',
    className: 'status-completed',
  },
}

export const NODE_TYPES = ['project', 'folder', 'task']

export function makeId(prefix = 'node') {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return `${prefix}-${randomPart}`
}

export function createNode({
  title = 'Novo item',
  description = '',
  type = 'task',
  status = 'pending',
  parentId = null,
} = {}) {
  const now = new Date().toISOString()

  return {
    id: makeId(type),
    parentId,
    title,
    description,
    type,
    status,
    children: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function findNodeById(node, targetId) {
  if (!node) return null

  if (node.id === targetId) return node

  for (const child of node.children) {
    const found = findNodeById(child, targetId)
    if (found) return found
  }

  return null
}

export function insertNode(root, parentId, newNode) {
  if (!root) return newNode

  if (root.id === parentId) {
    return {
      ...root,
      children: [...root.children, newNode],
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    ...root,
    children: root.children.map((child) => insertNode(child, parentId, newNode)),
    updatedAt: new Date().toISOString(),
  }
}

export function updateNode(root, targetId, updates) {
  if (!root) return root

  if (root.id === targetId) {
    return {
      ...root,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    ...root,
    children: root.children.map((child) => updateNode(child, targetId, updates)),
    updatedAt: new Date().toISOString(),
  }
}

export function deleteNode(root, targetId) {
  if (!root) return root

  if (root.id === targetId) return null

  const nextChildren = root.children
    .map((child) => deleteNode(child, targetId))
    .filter(Boolean)

  return {
    ...root,
    children: nextChildren,
    updatedAt: new Date().toISOString(),
  }
}

export function getAncestorIds(root, targetId, trail = []) {
  if (!root) return null
  if (root.id === targetId) return trail

  for (const child of root.children) {
    const result = getAncestorIds(child, targetId, [...trail, root.id])
    if (result) return result
  }

  return null
}

export function getDescendantIds(node) {
  const ids = []

  const walk = (current) => {
    current.children.forEach((child) => {
      ids.push(child.id)
      walk(child)
    })
  }

  walk(node)
  return ids
}

export function flattenTree(node, depth = 0, acc = []) {
  acc.push({ id: node.id, title: node.title, type: node.type, depth })
  node.children.forEach((child) => flattenTree(child, depth + 1, acc))
  return acc
}

export function canMoveNode(root, nodeId, newParentId) {
  if (!root || !nodeId || !newParentId) return false
  if (nodeId === newParentId) return false

  const node = findNodeById(root, nodeId)
  if (!node) return false
  if (node.type === 'project') return false

  const newParent = findNodeById(root, newParentId)
  if (!newParent) return false
  if (node.parentId === newParentId) return false

  const descendantIds = getDescendantIds(node)
  if (descendantIds.includes(newParentId)) return false

  return true
}

export function moveNode(root, nodeId, newParentId) {
  const nodeToMove = findNodeById(root, nodeId)
  if (!nodeToMove) return root

  const treeWithoutNode = deleteNode(root, nodeId)
  const movedNode = {
    ...nodeToMove,
    parentId: newParentId,
    updatedAt: new Date().toISOString(),
  }

  return insertNode(treeWithoutNode, newParentId, movedNode)
}

export function duplicateSubtree(node, parentId = node.parentId) {
  const now = new Date().toISOString()
  const newId = makeId(node.type)

  return {
    ...node,
    id: newId,
    parentId,
    children: node.children.map((child) => duplicateSubtree(child, newId)),
    createdAt: now,
    updatedAt: now,
  }
}

export function searchNodes(root, term) {
  const normalized = term.trim().toLowerCase()
  if (!normalized || !root) return []

  const matches = []

  const walk = (node) => {
    if (node.title.toLowerCase().includes(normalized)) matches.push(node)
    node.children.forEach(walk)
  }

  walk(root)
  return matches
}

export function filterTreeByTitle(node, term) {
  const normalized = term.trim().toLowerCase()

  if (!normalized) {
    return node
  }

  const matches = node.title.toLowerCase().includes(normalized)
  const filteredChildren = node.children
    .map((child) => filterTreeByTitle(child, term))
    .filter(Boolean)

  if (matches || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    }
  }

  return null
}

export function getNodeTypeLabel(type) {
  const labels = {
    project: 'Projeto',
    folder: 'Pasta',
    task: 'Atividade',
  }

  return labels[type] || 'Item'
}

export function getNodeIcon(type) {
  const icons = {
    project: '🎯',
    folder: '📁',
    task: '◈',
  }

  return icons[type] || '◈'
}
