import { useEffect, useState } from 'react'
import { STATUS_META, getNodeIcon, getNodeTypeLabel } from '../utils/treeUtils'

function NodeDetailsPanel({ node, isOpen, onClose, onUpdate, onDelete, onAddChild, onMove, onDuplicate }) {
  const [draftTitle, setDraftTitle] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  useEffect(() => {
    if (node) setDraftTitle(node.title)
    setShowNotes(false)
  }, [node])

  if (!isOpen || !node) return null

  const handleChange = (field, value) => {
    onUpdate(node.id, { [field]: value })
  }

  const commitTitle = () => {
    const nextTitle = draftTitle.trim()

    if (nextTitle === node.title) return

    if (!nextTitle) {
      setDraftTitle(node.title)
      return
    }

    onUpdate(node.id, { title: nextTitle })
  }

  const canMove = node.type !== 'project'

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div className="details-header">
            <div className="details-icon">{getNodeIcon(node.type)}</div>
            <div>
              <span className="details-type">{getNodeTypeLabel(node.type)}</span>
              <input
                className="details-title-input"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  }
                }}
                aria-label="Editar nome"
              />
            </div>
          </div>

          <div className="details-icon-actions">
            <button type="button" className="icon-button" onClick={() => onAddChild(node)} aria-label="Adicionar subtarefa" title="Adicionar subtarefa">
              +
            </button>

            {canMove && (
              <button type="button" className="icon-button" onClick={() => onMove(node)} aria-label="Mover" title="Mover">
                ↗
              </button>
            )}

            {canMove && (
              <button type="button" className="icon-button" onClick={() => onDuplicate(node.id)} aria-label="Duplicar" title="Duplicar">
                ⧉
              </button>
            )}

            <button
              type="button"
              className="icon-button icon-button-danger"
              onClick={() => onDelete(node.id)}
              aria-label="Excluir item"
              title="Excluir item"
            >
              🗑
            </button>

            <button type="button" className="close-button" onClick={onClose} aria-label="Fechar detalhes">
              ×
            </button>
          </div>
        </div>

        <div className="modal-form">
          <label>
            Descrição
            <textarea
              rows="6"
              value={node.description}
              onChange={(event) => handleChange('description', event.target.value)}
              placeholder="Sem descrição"
            />
          </label>

          <div className="collapsible-field">
            <button
              type="button"
              className="collapsible-toggle"
              onClick={() => setShowNotes((current) => !current)}
              aria-expanded={showNotes}
            >
              {showNotes ? '▾' : '▸'} Observações{!showNotes && node.notes ? ' •' : ''}
            </button>

            {showNotes && (
              <textarea
                rows="4"
                value={node.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                placeholder="Sem observações"
                aria-label="Observações"
              />
            )}
          </div>

          <label>
            Status
            <select value={node.status} onChange={(event) => handleChange('status', event.target.value)}>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.icon} {meta.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}

export default NodeDetailsPanel
