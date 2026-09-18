// Parser + validador do padrão OAF (Organization App Format).
//
// Regras (ver documento OAF v1.0): PROJETO é a raiz; ATIVIDADE pertence a um
// PROJETO; TAREFA pertence a uma ATIVIDADE; SUBTAREFA pertence a uma TAREFA;
// SUBSUBTAREFA pertence a uma SUBTAREFA. Quatro níveis progressivos de
// detalhamento abaixo do projeto — um objetivo simples pode parar em
// ATIVIDADE/TAREFA, um objetivo complexo pode aprofundar até SUBSUBTAREFA.
// Mapeamento para os tipos existentes da árvore (sem mudar o schema):
// ATIVIDADE, TAREFA e SUBTAREFA viram type "folder", SUBSUBTAREFA vira "task"
// (a folha executável, marcável como concluída).
//
// Extensão: linhas DESCRICAO:, OBSERVACAO: e CONTEUDO: não viram nó da
// árvore — elas preenchem, respectivamente, os campos `description`,
// `notes` e `conteudo` (já existentes em todo node) do último elemento
// declarado, seja PROJETO, ATIVIDADE, TAREFA, SUBTAREFA ou SUBSUBTAREFA.
// `conteudo` registra exatamente o que precisa ser estudado, aprendido,
// produzido ou executado nesse item. Linhas repetidas do mesmo campo para o
// mesmo elemento se acumulam como parágrafos.
//
// Uma estrutura inválida nunca é importada parcialmente: se houver qualquer
// erro, `project` volta null e `errors` lista todas as linhas com problema.

import { createNode } from '../../utils/treeUtils'

const LINE_PATTERN = /^(PROJETO|ATIVIDADE|TAREFA|SUBTAREFA|SUBSUBTAREFA|DESCRICAO|OBSERVACAO|CONTEUDO):\s*(.*)$/

const FIELD_BY_KEYWORD = { DESCRICAO: 'description', OBSERVACAO: 'notes', CONTEUDO: 'conteudo' }

export function parseOAF(text) {
  const errors = []
  const lines = String(text ?? '').split(/\r\n|\r|\n/)

  let project = null
  let currentAtividade = null
  let currentTarefa = null
  let currentSubtarefa = null
  let lastNode = null

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1
    const line = rawLine.trim()
    if (!line) return

    const match = line.match(LINE_PATTERN)
    if (!match) {
      errors.push({
        line: lineNumber,
        message: `Linha ${lineNumber}: formato não reconhecido ("${line}"). Esperado PROJETO/ATIVIDADE/TAREFA/SUBTAREFA/SUBSUBTAREFA/DESCRICAO/OBSERVACAO/CONTEUDO seguido de ":" e um texto.`,
      })
      return
    }

    const [, keyword, rawName] = match
    const name = rawName.trim()
    if (!name) {
      const noun = FIELD_BY_KEYWORD[keyword] ? 'sem conteúdo' : 'sem nome'
      errors.push({ line: lineNumber, message: `Linha ${lineNumber}: ${keyword} ${noun} depois dos dois-pontos.` })
      return
    }

    const field = FIELD_BY_KEYWORD[keyword]
    if (field) {
      if (!lastNode) {
        errors.push({
          line: lineNumber,
          message: `Linha ${lineNumber}: ${keyword} encontrada antes de qualquer PROJETO/ATIVIDADE/TAREFA/SUBTAREFA/SUBSUBTAREFA.`,
        })
        return
      }
      lastNode[field] = lastNode[field] ? `${lastNode[field]}\n${name}` : name
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
      currentAtividade = null
      currentTarefa = null
      currentSubtarefa = null
      lastNode = project
      return
    }

    if (keyword === 'ATIVIDADE') {
      if (!project) {
        errors.push({ line: lineNumber, message: `Linha ${lineNumber}: ATIVIDADE encontrada antes de um PROJETO.` })
        return
      }
      const atividade = createNode({ title: name, type: 'folder', parentId: project.id })
      project.children.push(atividade)
      currentAtividade = atividade
      currentTarefa = null
      currentSubtarefa = null
      lastNode = atividade
      return
    }

    if (keyword === 'TAREFA') {
      if (!currentAtividade) {
        errors.push({ line: lineNumber, message: `Linha ${lineNumber}: TAREFA encontrada antes de uma ATIVIDADE.` })
        return
      }
      const tarefa = createNode({ title: name, type: 'folder', parentId: currentAtividade.id })
      currentAtividade.children.push(tarefa)
      currentTarefa = tarefa
      currentSubtarefa = null
      lastNode = tarefa
      return
    }

    if (keyword === 'SUBTAREFA') {
      if (!currentTarefa) {
        errors.push({ line: lineNumber, message: `Linha ${lineNumber}: SUBTAREFA encontrada antes de uma TAREFA.` })
        return
      }
      const subtarefa = createNode({ title: name, type: 'folder', parentId: currentTarefa.id })
      currentTarefa.children.push(subtarefa)
      currentSubtarefa = subtarefa
      lastNode = subtarefa
      return
    }

    // SUBSUBTAREFA
    if (!currentSubtarefa) {
      errors.push({ line: lineNumber, message: `Linha ${lineNumber}: SUBSUBTAREFA encontrada antes de uma SUBTAREFA.` })
      return
    }
    const subsubtarefa = createNode({ title: name, type: 'task', parentId: currentSubtarefa.id })
    currentSubtarefa.children.push(subsubtarefa)
    lastNode = subsubtarefa
  })

  if (!project && errors.length === 0) {
    errors.push({ line: 0, message: 'Documento vazio: nenhum PROJETO encontrado.' })
  }

  if (errors.length > 0) {
    return { project: null, errors }
  }

  return { project, errors: [] }
}
