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
})
