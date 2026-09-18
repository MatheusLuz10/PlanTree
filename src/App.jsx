import { useEffect, useMemo, useState } from 'react'
import './App.css'
import BottomNavigation from './components/BottomNavigation'
import CreateNodeModal from './components/CreateNodeModal'
import Dashboard from './components/Dashboard'
import Home from './components/Home'
import ImportOafModal from './components/ImportOafModal'
import MoveNodeModal from './components/MoveNodeModal'
import NodeDetailsPanel from './components/NodeDetailsPanel'
import TreeNode from './components/TreeNode'
import { isApiConfigured } from './lib/apiClient'
import { useProjects } from './hooks/useProjects'
import { createInitialProject } from './data/initialData'
import { createNodeRow, deleteNodeRow, moveNodeRow, updateNodeRow } from './repositories/nodeRepository'
import {
  createProjectRow,
  deleteProjectRow,
  seedProjectWithNodes,
  updateProjectRow,
} from './repositories/projectRepository'
import { flattenNodes } from './repositories/treeMapper'
import {
  canMoveNode,
  createNode,
  deleteNode,
  duplicateSubtree,
  findNodeById,
  getAncestorIds,
  getDescendantIds,
  insertNode,
  moveNode,
  searchNodes,
  updateNode,
} from './utils/treeUtils'

function SetupNotice() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">🌳</span>
          <div>
            <p className="brand-label">Arvore</p>
            <h1>Configuração necessária</h1>
          </div>
        </div>
        <p className="auth-subtitle">
          Este app precisa de uma API rodando (Cloudflare Worker) para funcionar. Copie{' '}
          <code>.env.example</code> para <code>.env</code>, preencha <code>VITE_API_BASE_URL</code> e reinicie o
          servidor. Veja <code>CLOUDFLARE_SETUP.md</code> para o passo a passo completo.
        </p>
      </div>
    </div>
  )
}

function App() {
  if (!isApiConfigured) {
    return <SetupNotice />
  }

  return <TreeApp />
}

function TreeApp() {
  const { projects, loading, loadError, reload, syncStatus, syncError, persist } = useProjects()

  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [expandedMap, setExpandedMap] = useState({})
  const [search, setSearch] = useState('')
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'project',
    targetNode: null,
  })
  const [moveState, setMoveState] = useState({ isOpen: false, node: null })
  const [isOafImportOpen, setIsOafImportOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
      setSelectedNodeId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId],
  )

  const selectedNode = useMemo(() => {
    if (!selectedProject) return null
    return findNodeById(selectedProject, selectedNodeId)
  }, [selectedProject, selectedNodeId])

  const openProjectModal = () => {
    setModalState({ isOpen: true, mode: 'project', targetNode: null })
  }

  const openAddNodeModal = (node = selectedProject) => {
    setModalState({ isOpen: true, mode: 'node', targetNode: node })
  }

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'project', targetNode: null })
  }

  const openMoveModal = (node) => {
    setMoveState({ isOpen: true, node })
  }

  const closeMoveModal = () => {
    setMoveState({ isOpen: false, node: null })
  }

  const handleCreateProject = async ({ title, description, status }) => {
    if (!title.trim()) {
      alert('O projeto precisa de um nome.')
      return
    }

    const project = createNode({ title, description, type: 'project', status: status ?? 'pending', parentId: null })

    closeModal()
    setSelectedProjectId(project.id)
    setSelectedNodeId(project.id)
    setExpandedMap((current) => ({ ...current, [project.id]: false }))
    setActiveTab('tree')

    await persist([...projects, project], () => createProjectRow(project))
  }

  const handleCreateExampleProject = async () => {
    const example = createInitialProject()
    const descendantRows = flattenNodes(example).slice(1)

    setSelectedProjectId(example.id)
    setSelectedNodeId(example.id)
    setExpandedMap((current) => ({ ...current, [example.id]: false }))
    setActiveTab('tree')

    await persist([...projects, example], () => seedProjectWithNodes(example, descendantRows))
  }

  // `project` já vem validado e montado pelo parseOAF (src/lib/oaf/parser.js) — aqui só persistimos,
  // no mesmo formato atômico usado pelo projeto de exemplo.
  const handleImportOaf = async (project) => {
    const descendantRows = flattenNodes(project).slice(1)

    setIsOafImportOpen(false)
    setSelectedProjectId(project.id)
    setSelectedNodeId(project.id)
    setExpandedMap((current) => ({ ...current, [project.id]: false }))
    setActiveTab('tree')

    await persist([...projects, project], () => seedProjectWithNodes(project, descendantRows))
  }

  const handleCreateNode = async ({ title, description, type, status, parentId }) => {
    if (!title.trim()) {
      alert('O item precisa de um título.')
      return
    }

    if (!selectedProject) {
      alert('Crie um projeto antes de adicionar um item.')
      return
    }

    const newNode = createNode({ title, description, type, status: status ?? 'pending', parentId })
    const parentTarget = parentId ?? selectedProject.id

    const nextProject = insertNode(selectedProject, parentTarget, newNode)
    const nextProjects = projects.map((project) => (project.id === selectedProject.id ? nextProject : project))

    closeModal()
    setSelectedNodeId(newNode.id)
    setExpandedMap((current) => ({ ...current, [parentTarget]: true }))

    await persist(nextProjects, () => createNodeRow(newNode, selectedProject.id))
  }

  const handleToggleExpand = (nodeId) => {
    setExpandedMap((current) => ({
      ...current,
      [nodeId]: !(current[nodeId] ?? false),
    }))
  }

  const handleUpdateNode = async (nodeId, updates) => {
    if (!selectedProject) return

    if (updates.title !== undefined && !String(updates.title).trim()) {
      alert('O título não pode ficar vazio.')
      return
    }

    const nextProject = updateNode(selectedProject, nodeId, updates)
    const nextProjects = projects.map((project) => (project.id === selectedProject.id ? nextProject : project))

    const isProjectRoot = nodeId === selectedProject.id
    await persist(nextProjects, () =>
      isProjectRoot ? updateProjectRow(nodeId, updates) : updateNodeRow(nodeId, updates),
    )
  }

  const handleToggleComplete = async (nodeId) => {
    if (!selectedProject) return

    const target = findNodeById(selectedProject, nodeId)
    if (!target || target.type !== 'task') return

    await handleUpdateNode(nodeId, { status: target.status === 'completed' ? 'pending' : 'completed' })
  }

  // Retorna true se a exclusão realmente aconteceu (false se cancelada ou
  // inválida) — usado para só fechar o popup de detalhes quando faz sentido.
  const handleDeleteNode = async (nodeId) => {
    if (!selectedProject) return false

    const target = findNodeById(selectedProject, nodeId)
    if (!target) return false

    const isProject = target.type === 'project'
    const descendantCount = getDescendantIds(target).length
    const descendantWord = descendantCount === 1 ? 'atividade' : 'atividades'
    const confirmMessage = isProject
      ? descendantCount > 0
        ? `Este projeto possui ${descendantCount} ${descendantWord}. Todas elas serão removidas junto com o projeto. Deseja continuar?`
        : 'Este projeto será excluído. Deseja continuar?'
      : descendantCount > 0
        ? `Este item possui ${descendantCount} ${descendantWord}. Todas elas serão removidas. Deseja continuar?`
        : 'Deseja excluir este item?'

    if (!window.confirm(confirmMessage)) return false

    if (isProject) {
      const remainingProjects = projects.filter((project) => project.id !== nodeId)
      const nextSelected = remainingProjects[0] ?? null
      setSelectedProjectId(nextSelected?.id ?? null)
      setSelectedNodeId(nextSelected?.children?.[0]?.id ?? nextSelected?.id ?? null)

      await persist(remainingProjects, () => deleteProjectRow(nodeId))
      return true
    }

    const nextProject = deleteNode(selectedProject, nodeId)
    const nextProjects = projects.map((project) => (project.id === selectedProject.id ? nextProject : project))

    if (selectedProject.id === nodeId) {
      setSelectedNodeId(null)
    } else {
      const fallbackNode = nextProject?.children?.[0] ?? nextProject
      setSelectedNodeId(fallbackNode?.id ?? null)
    }

    await persist(nextProjects, () => deleteNodeRow(nodeId))
    return true
  }

  const handleMoveNode = async (nodeId, newParentId) => {
    if (!selectedProject) return

    if (!canMoveNode(selectedProject, nodeId, newParentId)) {
      alert('Não é possível mover este item para o local selecionado.')
      return
    }

    const nextProject = moveNode(selectedProject, nodeId, newParentId)
    const nextProjects = projects.map((project) => (project.id === selectedProject.id ? nextProject : project))

    setExpandedMap((current) => ({ ...current, [newParentId]: true }))
    closeMoveModal()

    await persist(nextProjects, () => moveNodeRow(nodeId, newParentId, selectedProject.id))
  }

  const handleDuplicateNode = async (nodeId) => {
    if (!selectedProject) return

    const target = findNodeById(selectedProject, nodeId)
    if (!target || target.type === 'project') return

    const duplicated = duplicateSubtree(target, target.parentId)
    duplicated.title = `${duplicated.title} (cópia)`

    const nextProject = insertNode(selectedProject, target.parentId, duplicated)
    const nextProjects = projects.map((project) => (project.id === selectedProject.id ? nextProject : project))

    setSelectedNodeId(duplicated.id)
    setExpandedMap((current) => ({ ...current, [target.parentId]: true }))

    const rows = flattenNodes(duplicated)
    await persist(nextProjects, async () => {
      for (const row of rows) {
        await createNodeRow(row, selectedProject.id)
      }
    })
  }

  const handleNavigateToNode = (nodeId, projectId = selectedProject?.id) => {
    const targetProject = projects.find((project) => project.id === projectId)
    if (!targetProject) return

    const ancestorIds = getAncestorIds(targetProject, nodeId) ?? []
    setExpandedMap((current) => {
      const next = { ...current }
      ancestorIds.forEach((id) => {
        next[id] = true
      })
      return next
    })
    setSearch('')
    setSelectedProjectId(targetProject.id)
    setSelectedNodeId(nodeId)
    setActiveTab('tree')
  }

  const handleSelectProjectFromDashboard = (projectId) => {
    setSelectedProjectId(projectId)
    setSelectedNodeId(projectId)
  }

  const handleOpenProjectFromHome = (projectId) => {
    setSelectedProjectId(projectId)
    setSelectedNodeId(projectId)
    setActiveTab('tree')
  }

  const crossProjectResults = useMemo(() => {
    const term = search.trim()
    if (!term || !selectedProject) return []

    return projects
      .filter((project) => project.id !== selectedProject.id)
      .flatMap((project) => searchNodes(project, term).map((node) => ({ project, node })))
  }, [projects, selectedProject, search])

  const filteredProject = useMemo(() => {
    if (!selectedProject) return null
    if (!search.trim()) return selectedProject

    const isMatch = (node) => node.title.toLowerCase().includes(search.trim().toLowerCase())

    const walk = (node) => {
      const children = node.children.map(walk).filter(Boolean)

      if (isMatch(node) || children.length > 0) {
        return { ...node, children }
      }

      return null
    }

    return walk(selectedProject)
  }, [selectedProject, search])

  if (loading) {
    return (
      <div className="auth-shell">
        <p className="empty-state">Carregando seus projetos...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>Erro ao carregar</h1>
          <p className="auth-error">{loadError}</p>
          <button type="button" className="primary-button" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">🌳</span>
          <div>
            <p className="brand-label">Arvore</p>
            <h1>{selectedProject?.title ?? 'Projeto'}</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar item"
            aria-label="Buscar item"
          />

          {projects.length > 0 && (
            <select
              aria-label="Selecionar projeto"
              value={selectedProjectId ?? ''}
              onChange={(event) => {
                const nextId = event.target.value
                setSelectedProjectId(nextId)
                setSelectedNodeId(nextId)
              }}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          )}

          <button type="button" className="primary-button" onClick={openProjectModal}>
            + Novo projeto
          </button>
        </div>
      </header>

      {syncStatus === 'saving' && <p className="sync-banner sync-banner-saving">Salvando...</p>}
      {syncStatus === 'error' && syncError && <p className="sync-banner sync-banner-error">{syncError}</p>}

      {!selectedProject || activeTab === 'home' ? (
        <main className="content-grid content-grid-single">
          <Home
            projects={projects}
            onOpenProject={handleOpenProjectFromHome}
            onCreateProject={openProjectModal}
            onCreateExampleProject={handleCreateExampleProject}
            onImportOaf={() => setIsOafImportOpen(true)}
          />
        </main>
      ) : activeTab === 'tree' ? (
        <main className="content-grid content-grid-single">
          <section className="tree-panel">
            <div className="tree-panel-header">
              <h2>Estrutura da árvore</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => openAddNodeModal(selectedNode ?? selectedProject)}
              >
                + Adicionar
              </button>
            </div>

            {crossProjectResults.length > 0 && (
              <div className="search-results-panel">
                <h3>Encontrado em outros projetos</h3>
                {crossProjectResults.map(({ project, node }) => (
                  <button
                    key={node.id}
                    type="button"
                    className="search-result-row"
                    onClick={() => handleNavigateToNode(node.id, project.id)}
                  >
                    <span>{node.title}</span>
                    <span className="search-result-project">em {project.title}</span>
                  </button>
                ))}
              </div>
            )}

            {filteredProject ? (
              <div className="tree-list">
                <TreeNode
                  node={filteredProject}
                  expandedMap={expandedMap}
                  onToggleExpand={handleToggleExpand}
                  onToggleComplete={handleToggleComplete}
                  onSelectNode={(node) => {
                    setSelectedNodeId(node.id)
                    setIsDetailsOpen(true)
                  }}
                  selectedId={selectedNodeId}
                  searchTerm={search.trim()}
                />
              </div>
            ) : (
              <p className="empty-state">Nenhum item corresponde à pesquisa.</p>
            )}
          </section>
        </main>
      ) : (
        <main className="content-grid content-grid-single">
          <Dashboard
            project={selectedProject}
            projects={projects}
            onNavigateToNode={handleNavigateToNode}
            onSelectProject={handleSelectProjectFromDashboard}
          />
        </main>
      )}

      <BottomNavigation
        onAddNode={() => openAddNodeModal(selectedNode ?? selectedProject)}
        currentTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <CreateNodeModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        targetNode={modalState.targetNode}
        onClose={closeModal}
        onSubmit={modalState.mode === 'project' ? handleCreateProject : handleCreateNode}
      />

      <ImportOafModal
        isOpen={isOafImportOpen}
        onClose={() => setIsOafImportOpen(false)}
        onImport={handleImportOaf}
      />

      <MoveNodeModal
        isOpen={moveState.isOpen}
        node={moveState.node}
        project={selectedProject}
        onClose={closeMoveModal}
        onConfirm={handleMoveNode}
      />

      <NodeDetailsPanel
        node={selectedNode}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onUpdate={handleUpdateNode}
        onDelete={async (nodeId) => {
          const deleted = await handleDeleteNode(nodeId)
          if (deleted) setIsDetailsOpen(false)
        }}
        onAddChild={(node) => {
          setIsDetailsOpen(false)
          openAddNodeModal(node)
        }}
        onMove={(node) => {
          setIsDetailsOpen(false)
          openMoveModal(node)
        }}
        onDuplicate={handleDuplicateNode}
      />
    </div>
  )
}

export default App
