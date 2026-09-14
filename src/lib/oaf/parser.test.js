import { describe, expect, it } from 'vitest'
import { parseOAF } from './parser'

describe('parseOAF', () => {
  it('aceita o documento mínimo: só PROJETO', () => {
    const { project, errors } = parseOAF('PROJETO: Meu Projeto')
    expect(errors).toEqual([])
    expect(project).toMatchObject({ title: 'Meu Projeto', type: 'project', children: [] })
  })

  it('constrói a hierarquia completa (PROJETO > ETAPA > ATIVIDADE > SUBTAREFA)', () => {
    const text = `
PROJETO: Criar Sistema de Organização

ETAPA: Planejamento

ATIVIDADE: Definir funcionalidades
SUBTAREFA: Definir cadastro de usuários
SUBTAREFA: Definir estrutura da árvore

ATIVIDADE: Criar documentação
SUBTAREFA: Criar padrão OAF

ETAPA: Desenvolvimento

ATIVIDADE: Criar núcleo da árvore
SUBTAREFA: Criar modelo de dados
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
    expect(definirFuncionalidades.children[0].type).toBe('task')

    expect(desenvolvimento.title).toBe('Desenvolvimento')
    expect(desenvolvimento.children[0].children[0].title).toBe('Criar modelo de dados')
  })

  it('permite várias ETAPAS, ATIVIDADES e SUBTAREFAS', () => {
    const text = `
PROJETO: P
ETAPA: E1
ATIVIDADE: A1
SUBTAREFA: S1
SUBTAREFA: S2
ATIVIDADE: A2
ETAPA: E2
ATIVIDADE: A3
`
    const { project, errors } = parseOAF(text)
    expect(errors).toEqual([])
    expect(project.children).toHaveLength(2)
    expect(project.children[0].children).toHaveLength(2)
    expect(project.children[0].children[0].children).toHaveLength(2)
    expect(project.children[1].children).toHaveLength(1)
  })

  it('rejeita documento vazio', () => {
    const { project, errors } = parseOAF('')
    expect(project).toBeNull()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/nenhum PROJETO/)
  })

  it('rejeita ETAPA antes de PROJETO', () => {
    const { project, errors } = parseOAF('ETAPA: Sozinha')
    expect(project).toBeNull()
    expect(errors[0].message).toMatch(/ETAPA encontrada antes de um PROJETO/)
    expect(errors[0].line).toBe(1)
  })

  it('rejeita ATIVIDADE antes de ETAPA', () => {
    const { errors } = parseOAF('PROJETO: P\nATIVIDADE: A')
    expect(errors[0].message).toMatch(/ATIVIDADE encontrada antes de uma ETAPA/)
    expect(errors[0].line).toBe(2)
  })

  it('rejeita SUBTAREFA antes de ATIVIDADE', () => {
    const { errors } = parseOAF('PROJETO: P\nETAPA: E\nSUBTAREFA: S')
    expect(errors[0].message).toMatch(/SUBTAREFA encontrada antes de uma ATIVIDADE/)
    expect(errors[0].line).toBe(3)
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
    const { errors } = parseOAF('ETAPA: E\nATIVIDADE: A\nSUBTAREFA: S')
    expect(errors).toHaveLength(3)
  })

  it('ignora linhas em branco', () => {
    const { project, errors } = parseOAF('PROJETO: P\n\n\nETAPA: E\n\n')
    expect(errors).toEqual([])
    expect(project.children).toHaveLength(1)
  })

  describe('DESCRICAO', () => {
    it('preenche a description do último elemento, sem virar nó da árvore', () => {
      const text = `
PROJETO: P
DESCRICAO: Descrição do projeto
ETAPA: E
DESCRICAO: Descrição da etapa
ATIVIDADE: A
SUBTAREFA: S1
DESCRICAO: Descrição da subtarefa 1
SUBTAREFA: S2
`
      const { project, errors } = parseOAF(text)
      expect(errors).toEqual([])
      expect(project.description).toBe('Descrição do projeto')

      const etapa = project.children[0]
      expect(etapa.description).toBe('Descrição da etapa')
      expect(etapa.children).toHaveLength(1) // DESCRICAO não virou node

      const atividade = etapa.children[0]
      expect(atividade.children.map((s) => s.title)).toEqual(['S1', 'S2'])
      expect(atividade.children[0].description).toBe('Descrição da subtarefa 1')
      expect(atividade.children[1].description).toBe('')
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
})
