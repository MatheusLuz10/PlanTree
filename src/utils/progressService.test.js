import { describe, expect, it } from 'vitest'
import { createNode } from './treeUtils'
import { calculateProgress, formatPercentage, getWorkUnits } from './progressService'

function buildTask(title, status) {
  return createNode({ title, type: 'task', status, parentId: 'x' })
}

function withChildren(node, children) {
  node.children = children
  return node
}

describe('calculateProgress', () => {
  it('caso 1: 4 tarefas, 4 concluídas => 100%', () => {
    const project = withChildren(createNode({ title: 'Projeto', type: 'project' }), [
      buildTask('A', 'completed'),
      buildTask('B', 'completed'),
      buildTask('C', 'completed'),
      buildTask('D', 'completed'),
    ])

    const result = calculateProgress(project)
    expect(result.total).toBe(4)
    expect(result.completed).toBe(4)
    expect(result.percentage).toBe(100)
  })

  it('caso 2: 4 tarefas, 2 concluídas => 50%', () => {
    const project = withChildren(createNode({ title: 'Projeto', type: 'project' }), [
      buildTask('A', 'completed'),
      buildTask('B', 'completed'),
      buildTask('C', 'pending'),
      buildTask('D', 'pending'),
    ])

    const result = calculateProgress(project)
    expect(result.percentage).toBe(50)
  })

  it('caso 3: 3 tarefas, 1 concluída => 33,3%', () => {
    const project = withChildren(createNode({ title: 'Projeto', type: 'project' }), [
      buildTask('A', 'completed'),
      buildTask('B', 'pending'),
      buildTask('C', 'in_progress'),
    ])

    const result = calculateProgress(project)
    expect(result.percentage).toBe(33.3)
    expect(formatPercentage(result.percentage)).toBe('33,3%')
  })

  it('caso 4: 0 tarefas => 0%, sem NaN/Infinity', () => {
    const project = createNode({ title: 'Projeto vazio', type: 'project' })

    const result = calculateProgress(project)
    expect(result.total).toBe(0)
    expect(result.percentage).toBe(0)
    expect(Number.isFinite(result.percentage)).toBe(true)
  })

  it('caso 5: múltiplos níveis encontram corretamente os descendentes (unidades de trabalho)', () => {
    const html = buildTask('HTML', 'completed')
    const css = buildTask('CSS', 'completed')
    const js = buildTask('JavaScript', 'pending')
    const frontend = withChildren(createNode({ title: 'Front-end', type: 'folder' }), [html, css, js])

    const api = buildTask('API', 'completed')
    const db = buildTask('Banco', 'pending')
    const backend = withChildren(createNode({ title: 'Back-end', type: 'folder' }), [api, db])

    const dev = withChildren(createNode({ title: 'Desenvolvimento', type: 'folder' }), [frontend, backend])
    const project = withChildren(createNode({ title: 'Projeto', type: 'project' }), [dev])

    // agrupadores (project, dev, frontend, backend) não contam como unidade de trabalho
    const units = getWorkUnits(project)
    expect(units.map((u) => u.title).sort()).toEqual(['API', 'Banco', 'CSS', 'HTML', 'JavaScript'].sort())

    expect(calculateProgress(frontend).percentage).toBe(66.7)
    expect(calculateProgress(backend).percentage).toBe(50)
    expect(calculateProgress(dev).percentage).toBe(60)
    expect(calculateProgress(project).percentage).toBe(60)
  })

  it('nó folha sem filhos: progresso é determinado pelo próprio status', () => {
    expect(calculateProgress(buildTask('Sozinha', 'completed')).percentage).toBe(100)
    expect(calculateProgress(buildTask('Sozinha', 'in_progress')).percentage).toBe(0)
    expect(calculateProgress(buildTask('Sozinha', 'pending')).percentage).toBe(0)
  })
})

describe('consistência entre árvore, categorias e dashboard (seção 34)', () => {
  it('Projeto > Categoria A (A1✓,A2✓,A3○) + Categoria B (B1✓,B2○) => 60% em todos os níveis relevantes', () => {
    const categoryA = withChildren(createNode({ title: 'Categoria A', type: 'folder' }), [
      buildTask('A1', 'completed'),
      buildTask('A2', 'completed'),
      buildTask('A3', 'pending'),
    ])
    const categoryB = withChildren(createNode({ title: 'Categoria B', type: 'folder' }), [
      buildTask('B1', 'completed'),
      buildTask('B2', 'pending'),
    ])
    const project = withChildren(createNode({ title: 'Projeto', type: 'project' }), [categoryA, categoryB])

    const projectProgress = calculateProgress(project)
    expect(projectProgress.total).toBe(5)
    expect(projectProgress.completed).toBe(3)
    expect(projectProgress.percentage).toBe(60)

    // mesma regra central usada para qualquer nível
    expect(calculateProgress(categoryA).percentage).toBe(66.7)
    expect(calculateProgress(categoryB).percentage).toBe(50)
  })
})
