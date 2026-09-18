import { describe, expect, it } from 'vitest'
import { parseOAF } from './parser'

describe('parseOAF', () => {
  it('aceita o documento mínimo: só PROJETO', () => {
    const { project, errors } = parseOAF('PROJETO: Meu Projeto')
    expect(errors).toEqual([])
    expect(project).toMatchObject({ title: 'Meu Projeto', type: 'project', children: [] })
  })

  it('constrói a hierarquia completa (PROJETO > ATIVIDADE > TAREFA > SUBTAREFA > SUBSUBTAREFA)', () => {
    const text = `
PROJETO: Criar Sistema de Organização

ATIVIDADE: Planejamento

TAREFA: Definir funcionalidades
SUBTAREFA: Definir cadastro de usuários
SUBSUBTAREFA: Escrever os campos do cadastro
SUBTAREFA: Definir estrutura da árvore

TAREFA: Criar documentação
SUBTAREFA: Criar padrão OAF

ATIVIDADE: Desenvolvimento

TAREFA: Criar núcleo da árvore
SUBTAREFA: Criar modelo de dados
SUBSUBTAREFA: Escrever o esquema do banco
`
    const { project, errors } = parseOAF(text)
    expect(errors).toEqual([])
    expect(project.title).toBe('Criar Sistema de Organização')
    expect(project.type).toBe('project')
    expect(project.children).toHaveLength(2)

    const [planejamento, desenvolvimento] = project.children
    expect(planejamento.title).toBe('Planejamento')
    expect(planejamento.type).toBe('folder')
    expect(planejamento.children.map((a) => a.title)).toEqual(['Definir funcionalidades', 'Criar documentação'])

    const [definirFuncionalidades] = planejamento.children
    expect(definirFuncionalidades.type).toBe('folder')
    expect(definirFuncionalidades.children.map((s) => s.title)).toEqual([
      'Definir cadastro de usuários',
      'Definir estrutura da árvore',
    ])
    expect(definirFuncionalidades.children[0].type).toBe('folder')
    expect(definirFuncionalidades.children[0].children.map((s) => s.title)).toEqual([
      'Escrever os campos do cadastro',
    ])
    expect(definirFuncionalidades.children[0].children[0].type).toBe('task')

    expect(desenvolvimento.title).toBe('Desenvolvimento')
    expect(desenvolvimento.children[0].children[0].children[0].title).toBe('Escrever o esquema do banco')
  })

  it('permite várias ATIVIDADES, TAREFAS, SUBTAREFAS e SUBSUBTAREFAS', () => {
    const text = `
PROJETO: P
ATIVIDADE: E1
TAREFA: A1
SUBTAREFA: S1
SUBSUBTAREFA: SS1
SUBTAREFA: S2
TAREFA: A2
ATIVIDADE: E2
TAREFA: A3
`
    const { project, errors } = parseOAF(text)
    expect(errors).toEqual([])
    expect(project.children).toHaveLength(2)
    expect(project.children[0].children).toHaveLength(2)
    expect(project.children[0].children[0].children).toHaveLength(2)
    expect(project.children[0].children[0].children[0].children).toHaveLength(1)
    expect(project.children[1].children).toHaveLength(1)
  })

  it('rejeita documento vazio', () => {
    const { project, errors } = parseOAF('')
    expect(project).toBeNull()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/nenhum PROJETO/)
  })

  it('rejeita ATIVIDADE antes de PROJETO', () => {
    const { project, errors } = parseOAF('ATIVIDADE: Sozinha')
    expect(project).toBeNull()
    expect(errors[0].message).toMatch(/ATIVIDADE encontrada antes de um PROJETO/)
    expect(errors[0].line).toBe(1)
  })

  it('rejeita TAREFA antes de ATIVIDADE', () => {
    const { errors } = parseOAF('PROJETO: P\nTAREFA: A')
    expect(errors[0].message).toMatch(/TAREFA encontrada antes de uma ATIVIDADE/)
    expect(errors[0].line).toBe(2)
  })

  it('rejeita SUBTAREFA antes de TAREFA', () => {
    const { errors } = parseOAF('PROJETO: P\nATIVIDADE: E\nSUBTAREFA: S')
    expect(errors[0].message).toMatch(/SUBTAREFA encontrada antes de uma TAREFA/)
    expect(errors[0].line).toBe(3)
  })

  it('rejeita SUBSUBTAREFA antes de SUBTAREFA', () => {
    const { errors } = parseOAF('PROJETO: P\nATIVIDADE: E\nTAREFA: A\nSUBSUBTAREFA: SS')
    expect(errors[0].message).toMatch(/SUBSUBTAREFA encontrada antes de uma SUBTAREFA/)
    expect(errors[0].line).toBe(4)
  })

  it('rejeita PROJETO duplicado', () => {
    const { errors } = parseOAF('PROJETO: A\nPROJETO: B')
    expect(errors[0].message).toMatch(/já existe um PROJETO/)
    expect(errors[0].line).toBe(2)
  })

  it('rejeita nome vazio', () => {
    const { errors } = parseOAF('PROJETO:')
    expect(errors[0].message).toMatch(/sem nome/)
  })

  it('rejeita linha em formato não reconhecido, com número da linha', () => {
    const { errors } = parseOAF('PROJETO: P\nisso aqui não é OAF')
    expect(errors[0].message).toMatch(/formato não reconhecido/)
    expect(errors[0].line).toBe(2)
  })

  it('reporta múltiplos erros de uma vez, não só o primeiro', () => {
    const { errors } = parseOAF('ATIVIDADE: E\nTAREFA: A\nSUBTAREFA: S')
    expect(errors).toHaveLength(3)
  })

  it('ignora linhas em branco', () => {
    const { project, errors } = parseOAF('PROJETO: P\n\n\nATIVIDADE: E\n\n')
    expect(errors).toEqual([])
    expect(project.children).toHaveLength(1)
  })

  describe('DESCRICAO', () => {
    it('preenche a description do último elemento, sem virar nó da árvore', () => {
      const text = `
PROJETO: P
DESCRICAO: Descrição do projeto
ATIVIDADE: E
DESCRICAO: Descrição da atividade
TAREFA: A
SUBTAREFA: S1
DESCRICAO: Descrição da subtarefa 1
SUBTAREFA: S2
`
      const { project, errors } = parseOAF(text)
      expect(errors).toEqual([])
      expect(project.description).toBe('Descrição do projeto')

      const atividade = project.children[0]
      expect(atividade.description).toBe('Descrição da atividade')
      expect(atividade.children).toHaveLength(1) // DESCRICAO não virou node

      const tarefa = atividade.children[0]
      expect(tarefa.children.map((s) => s.title)).toEqual(['S1', 'S2'])
      expect(tarefa.children[0].description).toBe('Descrição da subtarefa 1')
      expect(tarefa.children[1].description).toBe('')
    })

    it('acumula múltiplas linhas DESCRICAO seguidas como parágrafos', () => {
      const { project, errors } = parseOAF('PROJETO: P\nDESCRICAO: Linha 1\nDESCRICAO: Linha 2')
      expect(errors).toEqual([])
      expect(project.description).toBe('Linha 1\nLinha 2')
    })

    it('rejeita DESCRICAO antes de qualquer elemento', () => {
      const { errors } = parseOAF('DESCRICAO: Sozinha')
      expect(errors[0].message).toMatch(/DESCRICAO encontrada antes de qualquer/)
      expect(errors[0].line).toBe(1)
    })

    it('rejeita DESCRICAO sem conteúdo', () => {
      const { errors } = parseOAF('PROJETO: P\nDESCRICAO:')
      expect(errors[0].message).toMatch(/sem conteúdo/)
    })
  })

  describe('OBSERVACAO', () => {
    it('preenche a notes do último elemento, independente da DESCRICAO', () => {
      const { project, errors } = parseOAF('PROJETO: P\nDESCRICAO: Desc\nOBSERVACAO: Nota')
      expect(errors).toEqual([])
      expect(project.description).toBe('Desc')
      expect(project.notes).toBe('Nota')
    })

    it('acumula múltiplas linhas OBSERVACAO seguidas como parágrafos', () => {
      const { project, errors } = parseOAF('PROJETO: P\nOBSERVACAO: Linha 1\nOBSERVACAO: Linha 2')
      expect(errors).toEqual([])
      expect(project.notes).toBe('Linha 1\nLinha 2')
    })

    it('rejeita OBSERVACAO antes de qualquer elemento', () => {
      const { errors } = parseOAF('OBSERVACAO: Sozinha')
      expect(errors[0].message).toMatch(/OBSERVACAO encontrada antes de qualquer/)
      expect(errors[0].line).toBe(1)
    })

    it('rejeita OBSERVACAO sem conteúdo', () => {
      const { errors } = parseOAF('PROJETO: P\nOBSERVACAO:')
      expect(errors[0].message).toMatch(/sem conteúdo/)
    })
  })

  describe('CONTEUDO', () => {
    it('preenche a conteudo do último elemento, independente de DESCRICAO e OBSERVACAO', () => {
      const { project, errors } = parseOAF(
        'PROJETO: P\nDESCRICAO: Desc\nOBSERVACAO: Nota\nCONTEUDO: Estudar X e produzir Y',
      )
      expect(errors).toEqual([])
      expect(project.description).toBe('Desc')
      expect(project.notes).toBe('Nota')
      expect(project.conteudo).toBe('Estudar X e produzir Y')
    })

    it('acumula múltiplas linhas CONTEUDO seguidas como parágrafos', () => {
      const { project, errors } = parseOAF('PROJETO: P\nCONTEUDO: Linha 1\nCONTEUDO: Linha 2')
      expect(errors).toEqual([])
      expect(project.conteudo).toBe('Linha 1\nLinha 2')
    })

    it('preenche o conteudo de uma SUBSUBTAREFA (a folha executável)', () => {
      const text = `
PROJETO: P
ATIVIDADE: E
TAREFA: A
SUBTAREFA: S
SUBSUBTAREFA: SS
CONTEUDO: Ler o capítulo 3 e resolver os exercícios.
`
      const { project, errors } = parseOAF(text)
      expect(errors).toEqual([])
      const subsubtarefa = project.children[0].children[0].children[0].children[0]
      expect(subsubtarefa.title).toBe('SS')
      expect(subsubtarefa.type).toBe('task')
      expect(subsubtarefa.conteudo).toBe('Ler o capítulo 3 e resolver os exercícios.')
    })

    it('rejeita CONTEUDO antes de qualquer elemento', () => {
      const { errors } = parseOAF('CONTEUDO: Sozinha')
      expect(errors[0].message).toMatch(/CONTEUDO encontrada antes de qualquer/)
      expect(errors[0].line).toBe(1)
    })

    it('rejeita CONTEUDO sem conteúdo', () => {
      const { errors } = parseOAF('PROJETO: P\nCONTEUDO:')
      expect(errors[0].message).toMatch(/sem conteúdo/)
    })
  })
})
