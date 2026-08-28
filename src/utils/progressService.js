export function getWorkUnits(node) {
  if (!node) return []

  if (node.children.length === 0) {
    // Project/folder nodes are pure aggregators: an empty one contributes
    // no work, it never counts as a pending task on its own.
    return node.type === 'task' ? [node] : []
  }

  return node.children.flatMap(getWorkUnits)
}

export function calculateProgress(node) {
  const units = getWorkUnits(node)
  const total = units.length
  const completed = units.filter((unit) => unit.status === 'completed').length
  const inProgress = units.filter((unit) => unit.status === 'in_progress').length
  const pending = units.filter((unit) => unit.status === 'pending').length
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10

  return { total, completed, pending, inProgress, percentage }
}

export function formatPercentage(value) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1).replace('.', ',')}%`
}

export function getCategoryStats(node) {
  if (!node) return []

  return node.children.map((child) => ({
    id: child.id,
    title: child.title,
    type: child.type,
    progress: calculateProgress(child),
  }))
}

export function getProjectsOverview(projects) {
  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    progress: calculateProgress(project),
  }))
}

export function getRecentTasks(root, limit = 5) {
  return getWorkUnits(root)
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
}

export function getTasksByStatus(root, status = 'all') {
  const units = getWorkUnits(root)
  const filtered = status === 'all' ? units : units.filter((unit) => unit.status === status)

  return filtered.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export function formatRelativeDate(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)

  if (diffDays <= 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  return date.toLocaleDateString('pt-BR')
}
