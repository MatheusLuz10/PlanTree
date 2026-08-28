import { useCallback, useEffect, useState } from 'react'
import { getNodeRows } from '../repositories/nodeRepository'
import { getProjectRows } from '../repositories/projectRepository'
import { buildProjectTree } from '../repositories/treeMapper'

const SAVE_ERROR_MESSAGE = 'Não foi possível salvar. Verifique sua conexão e tente novamente.'
const LOAD_ERROR_MESSAGE = 'Não foi possível carregar seus projetos. Verifique sua conexão e tente novamente.'

// Sem autenticação por enquanto: todos os projetos do Worker/D1 são
// carregados diretamente, sem filtro por usuário.
export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'saving' | 'error'
  const [syncError, setSyncError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const projectRows = await getProjectRows()
      const trees = await Promise.all(
        projectRows.map(async (row) => {
          const nodeRows = await getNodeRows(row.id)
          return buildProjectTree(row, nodeRows)
        }),
      )
      setProjects(trees)
    } catch (err) {
      console.error('Falha ao carregar projetos:', err)
      setLoadError(LOAD_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Aplica a mutação local (otimista) imediatamente e persiste em seguida.
  // Se a gravação falhar, reverte para o estado anterior e sinaliza o erro
  // — nunca deixamos a UI "confirmar" algo que o banco não confirmou.
  const persist = useCallback(
    async (nextProjects, action) => {
      const snapshot = projects
      setProjects(nextProjects)
      setSyncStatus('saving')
      setSyncError(null)

      try {
        await action()
        setSyncStatus('idle')
      } catch (err) {
        console.error('Falha ao salvar alteração:', err)
        setProjects(snapshot)
        setSyncStatus('error')
        setSyncError(SAVE_ERROR_MESSAGE)
      }
    },
    [projects],
  )

  return {
    projects,
    setProjects,
    loading,
    loadError,
    reload: load,
    syncStatus,
    syncError,
    persist,
  }
}
