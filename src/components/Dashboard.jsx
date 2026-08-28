import { useMemo, useState } from 'react'
import { STATUS_META, getNodeIcon } from '../utils/treeUtils'
import {
  calculateProgress,
  formatPercentage,
  formatRelativeDate,
  getCategoryStats,
  getProjectsOverview,
  getRecentTasks,
  getTasksByStatus,
} from '../utils/progressService'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'completed', label: 'Concluídas' },
]

function ProgressBar({ percentage }) {
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
    </div>
  )
}

function Dashboard({ project, projects, onNavigateToNode, onSelectProject }) {
  const [filter, setFilter] = useState('pending')

  const progress = useMemo(() => (project ? calculateProgress(project) : null), [project])
  const categories = useMemo(() => (project ? getCategoryStats(project) : []), [project])
  const recentTasks = useMemo(() => (project ? getRecentTasks(project, 5) : []), [project])
  const filteredTasks = useMemo(
    () => (project ? getTasksByStatus(project, filter) : []),
    [project, filter],
  )
  const projectsOverview = useMemo(() => getProjectsOverview(projects), [projects])

  if (!project) {
    return (
      <section className="dashboard-panel">
        <p className="empty-state">Nenhum projeto selecionado.</p>
      </section>
    )
  }

  if (progress.total === 0) {
    return (
      <section className="dashboard-panel">
        <div className="dashboard-overview">
          <h2>Meu progresso</h2>
          <p className="empty-state">
            Nenhuma atividade cadastrada.
            <br />
            Comece adicionando uma atividade.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-panel">
      <div className="dashboard-overview">
        <div className="dashboard-overview-header">
          <div>
            <span className="details-type">Projeto</span>
            <h2>{project.title}</h2>
          </div>
          {progress.percentage === 100 && <span className="dashboard-badge">🎉 Projeto concluído</span>}
        </div>

        <ProgressBar percentage={progress.percentage} />
        <p className="progress-percentage">{formatPercentage(progress.percentage)} concluído</p>

        <div className="stat-grid">
          <div className="stat-card">
            <strong>{progress.total}</strong>
            <span>Total</span>
          </div>
          <div className="stat-card">
            <strong>{progress.completed}</strong>
            <span>Concluídas</span>
          </div>
          <div className="stat-card">
            <strong>{progress.inProgress}</strong>
            <span>Em andamento</span>
          </div>
          <div className="stat-card">
            <strong>{progress.pending}</strong>
            <span>Pendentes</span>
          </div>
        </div>
      </div>

      {projectsOverview.length > 1 && (
        <div className="dashboard-section">
          <h3>Meus projetos</h3>
          <div className="category-list">
            {projectsOverview.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`category-row ${item.id === project.id ? 'category-row-active' : ''}`}
                onClick={() => onSelectProject(item.id)}
              >
                <span className="category-title">{item.title}</span>
                <ProgressBar percentage={item.progress.percentage} />
                <span className="category-percentage">{formatPercentage(item.progress.percentage)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="dashboard-section">
          <h3>Progresso por área</h3>
          <div className="category-list">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="category-row"
                onClick={() => onNavigateToNode(category.id)}
              >
                <span className="category-title">{category.title}</span>
                <ProgressBar percentage={category.progress.percentage} />
                <span className="category-percentage">{formatPercentage(category.progress.percentage)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-section">
        <h3>Atividades recentes</h3>
        {recentTasks.length === 0 ? (
          <p className="empty-state">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="activity-list">
            {recentTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="activity-row"
                onClick={() => onNavigateToNode(task.id)}
              >
                <span className={`status-indicator ${STATUS_META[task.status]?.className ?? 'status-pending'}`}>
                  {STATUS_META[task.status]?.icon ?? '○'}
                </span>
                <span className="activity-text">
                  <span className="node-title">{task.title}</span>
                  <span className="node-meta">
                    {STATUS_META[task.status]?.label} · {formatRelativeDate(task.updatedAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Atividades</h3>
          <div className="filter-chips">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-chip ${filter === item.id ? 'filter-chip-active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="empty-state">Nenhuma atividade nesse filtro.</p>
        ) : (
          <div className="activity-list">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="activity-row"
                onClick={() => onNavigateToNode(task.id)}
              >
                <span className="node-icon" aria-hidden="true">
                  {getNodeIcon(task.type)}
                </span>
                <span className={`status-indicator ${STATUS_META[task.status]?.className ?? 'status-pending'}`}>
                  {STATUS_META[task.status]?.icon ?? '○'}
                </span>
                <span className="activity-text">
                  <span className="node-title">{task.title}</span>
                  <span className="node-meta">{STATUS_META[task.status]?.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Dashboard
