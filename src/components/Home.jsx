import { useMemo } from 'react'
import { formatPercentage, getProjectsOverview } from '../utils/progressService'

function ProgressBar({ percentage }) {
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
    </div>
  )
}

function Home({ projects, onOpenProject, onCreateProject, onCreateExampleProject }) {
  const overview = useMemo(() => getProjectsOverview(projects), [projects])

  if (projects.length === 0) {
    return (
      <section className="home-panel">
        <h1>Olá!</h1>
        <div className="empty-project-panel">
          <h2>Você ainda não possui projetos</h2>
          <p className="empty-state">Comece criando seu primeiro projeto.</p>
          <div className="details-actions">
            <button type="button" className="primary-button" onClick={onCreateProject}>
              + Criar projeto
            </button>
            <button type="button" className="secondary-button" onClick={onCreateExampleProject}>
              + Criar projeto de exemplo
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="home-panel">
      <h1>Olá!</h1>
      <h2 className="home-subheading">Meus projetos</h2>

      <div className="project-card-grid">
        {overview.map((item) => (
          <button
            key={item.id}
            type="button"
            className="project-card"
            onClick={() => onOpenProject(item.id)}
          >
            <span className="project-card-title">{item.title}</span>
            <ProgressBar percentage={item.progress.percentage} />
            <div className="project-card-footer">
              <span>{formatPercentage(item.progress.percentage)}</span>
              <span>
                {item.progress.total} atividade{item.progress.total === 1 ? '' : 's'}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button type="button" className="primary-button home-new-project" onClick={onCreateProject}>
        + Novo projeto
      </button>
    </section>
  )
}

export default Home
