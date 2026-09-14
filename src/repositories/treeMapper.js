// Converte entre o formato de linhas do banco (snake_case, tabelas
// "projects"/"nodes" separadas) e a árvore aninhada (camelCase, com
// `children`) que treeUtils/progressService/os componentes já esperam.
// Nenhum outro módulo da árvore ou do dashboard precisa saber de onde os
// dados vêm (Worker + D1).
//
// Detalhe importante: no modelo em memória (Etapas 1-3), o próprio projeto é
// um node-raiz sintético e seus filhos diretos têm `parentId = project.id`.
// No banco não existe uma linha em `nodes` para o projeto, então um item de
// primeiro nível é gravado com `parent_id = null`. As funções abaixo fazem
// essa tradução nos dois sentidos.

export function resolveDbParentId(parentId, projectId) {
  return parentId === projectId ? null : parentId
}

export function rowToNode(row, projectId, children = []) {
  return {
    id: row.id,
    parentId: row.parent_id ?? projectId,
    title: row.title,
    description: row.description ?? '',
    notes: row.notes ?? '',
    type: row.type,
    status: row.status,
    children,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function buildProjectTree(projectRow, nodeRows) {
  const childrenByParent = new Map()

  nodeRows.forEach((row) => {
    const key = row.parent_id ?? 'ROOT'
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key).push(row)
  })

  const buildSubtree = (row) =>
    rowToNode(
      row,
      projectRow.id,
      (childrenByParent.get(row.id) ?? []).map(buildSubtree),
    )

  const topLevel = childrenByParent.get('ROOT') ?? []

  return {
    id: projectRow.id,
    parentId: null,
    title: projectRow.name,
    description: projectRow.description ?? '',
    notes: projectRow.notes ?? '',
    type: 'project',
    status: projectRow.status,
    children: topLevel.map(buildSubtree),
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at,
  }
}

// Achata uma subárvore em pré-ordem (pai sempre antes dos filhos) — necessário
// para inserir linhas respeitando a FK de parent_id.
export function flattenNodes(node) {
  return [node, ...node.children.flatMap(flattenNodes)]
}

export function projectToRow(project) {
  return {
    id: project.id,
    name: project.title,
    description: project.description ?? '',
    notes: project.notes ?? '',
    status: project.status,
  }
}

export function nodeToRow(node, projectId) {
  return {
    id: node.id,
    project_id: projectId,
    parent_id: resolveDbParentId(node.parentId, projectId),
    title: node.title,
    description: node.description ?? '',
    notes: node.notes ?? '',
    type: node.type,
    status: node.status,
  }
}
