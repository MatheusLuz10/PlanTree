// Parser + validador do padrão OAF (Organization App Format).
//
// Regras (ver documento OAF v1.0): PROJETO é a raiz; ETAPA pertence a um
// PROJETO; ATIVIDADE pertence a uma ETAPA; SUBTAREFA pertence a uma
// ATIVIDADE. Mapeamento para os tipos existentes da árvore (sem mudar o
// schema): ETAPA e ATIVIDADE viram type "folder", SUBTAREFA vira "task".
//
// Extensão: uma linha DESCRICAO: não vira nó da árvore — ela preenche o
// campo `description` (já existente em todo node) do último elemento
// declarado, seja PROJETO, ETAPA, ATIVIDADE ou SUBTAREFA. Várias linhas
// DESCRICAO seguidas para o mesmo elemento se acumulam como parágrafos.
//
// Uma estrutura inválida nunca é importada parcialmente: se houver qualquer
// erro, `project` volta null e `errors` lista todas as linhas com problema.

import { createNode } from '../../utils/treeUtils'

const LINE_PATTERN = /^(PROJETO|ETAPA|ATIVIDADE|SUBTAREFA|DESCRICAO):\s*(.*)$/

export function parseOAF(text) {
  const errors = []
  const lines = String(text ?? '').split(/\r\n|\r|\n/)

  let project = null
  let currentEtapa = null
  let currentAtividade = null
  let lastNode = null

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1
    const line = rawLine.trim()
    if (!line) return

    const match = line.match(LINE_PATTERN)
    if (!match) {
      errors.push({
        line: lineNumber,
        message: `Linha ${lineNumber}: formato não reconhecido ("${line}"). Esperado PROJETO/ETAPA/ATIVIDADE/SUBTAREFA/DESCRICAO seguido de ":" e um texto.`,
      })
      return
    }

    const [, keyword, rawName] = match
    const name = rawName.trim()
    if (!name) {
      const noun = keyword === 'DESCRICAO' ? 'sem conteúdo' : 'sem nome'
      errors.push({ line: lineNumber, message: `Linha ${lineNumber}: ${keyword} ${noun} depois dos dois-pontos.` })
      return
    }

    if (keyword === 'DESCRICAO') {
      if (!lastNode) {
        errors.push({
          line: lineNumber,
          message: `Linha ${lineNumber}: DESCRICAO encontrada antes de qualquer PROJETO/ETAPA/ATIVIDADE/SUBTAREFA.`,
        })
        return
      }
      lastNode.description = lastNode.description ? `${lastNode.description}\n${name}` : name
      return
    }

    if (keyword === 'PROJETO') {
      if (project) {
        errors.push({
          line: lineNumber,
          message: `Linha ${lineNumber}: já existe um PROJETO definido neste documento (apenas um é permitido).`,
        })
        return
      }
      project = createNode({ title: name, type: 'project', parentId: null })
      currentEtapa = null
      currentAtividade = null
      lastNode = project
      return
    }

    if (keyword === 'ETAPA') {
      if (!project) {
        errors.push({ line: lineNumber, message: `Linha ${lineNumber}: ETAPA encontrada antes de um PROJETO.` })
        return
      }
      const etapa = createNode({ title: name, type: 'folder', parentId: project.id })
      project.children.push(etapa)
      currentEtapa = etapa
      currentAtividade = null
      lastNode = etapa
      return
    }

    if (keyword === 'ATIVIDADE') {
      if (!currentEtapa) {
        errors.push({ line: lineNumber, message: `Linha ${lineNumber}: ATIVIDADE encontrada antes de uma ETAPA.` })
        return
      }
      const atividade = createNode({ title: name, type: 'folder', parentId: currentEtapa.id })
      currentEtapa.children.push(atividade)
      currentAtividade = atividade
      lastNode = atividade
      return
    }

    // SUBTAREFA
    if (!currentAtividade) {
      errors.push({ line: lineNumber, message: `Linha ${lineNumber}: SUBTAREFA encontrada antes de uma ATIVIDADE.` })
      return
    }
    const subtarefa = createNode({ title: name, type: 'task', parentId: currentAtividade.id })
    currentAtividade.children.push(subtarefa)
    lastNode = subtarefa
  })

  if (!project && errors.length === 0) {
    errors.push({ line: 0, message: 'Documento vazio: nenhum PROJETO encontrado.' })
  }

  if (errors.length > 0) {
    return { project: null, errors }
  }

  return { project, errors: [] }
}
