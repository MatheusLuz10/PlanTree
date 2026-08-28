import { createNode } from '../utils/treeUtils'

export const createInitialProject = () => {
  const project = createNode({
    title: 'Meu Projeto',
    description: 'Estrutura inicial para organização de objetivos e tarefas.',
    type: 'project',
    status: 'in_progress',
    parentId: null,
  })

  const fundamentos = createNode({
    title: '1. Fundamentos',
    description: 'Base de conhecimento e planejamento.',
    type: 'folder',
    parentId: project.id,
  })

  const programacao = createNode({
    title: 'Programação',
    description: 'Aprendizado de lógica e prática.',
    type: 'folder',
    parentId: fundamentos.id,
  })

  const logica = createNode({
    title: 'Lógica de programação',
    description: 'Compreender pensamento computacional.',
    type: 'task',
    status: 'pending',
    parentId: programacao.id,
  })

  const variaveis = createNode({
    title: 'Variáveis',
    description: 'Definir e manipular dados.',
    type: 'task',
    status: 'completed',
    parentId: programacao.id,
  })

  const estruturas = createNode({
    title: 'Estruturas de controle',
    description: 'Fluxos condicionais e laços.',
    type: 'task',
    status: 'in_progress',
    parentId: programacao.id,
  })

  const desenvolvimento = createNode({
    title: '2. Desenvolvimento',
    description: 'Construção e integração.',
    type: 'folder',
    parentId: project.id,
  })

  const frontend = createNode({
    title: 'Front-end',
    description: 'Interface visual e usabilidade.',
    type: 'folder',
    parentId: desenvolvimento.id,
  })

  const backend = createNode({
    title: 'Back-end',
    description: 'Serviços e regras de negócio.',
    type: 'folder',
    parentId: desenvolvimento.id,
  })

  project.children = [fundamentos, desenvolvimento]
  fundamentos.children = [programacao]
  programacao.children = [logica, variaveis, estruturas]
  desenvolvimento.children = [frontend, backend]

  return project
}

export const initialProjects = [createInitialProject()]
