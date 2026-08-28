import { useState } from 'react'
import { flattenTree, getDescendantIds, getNodeIcon } from '../utils/treeUtils'

function MoveNodeModal({ isOpen, node, project, onClose, onConfirm }) {
  const [selectedParentId, setSelectedParentId] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !node || !project) return null

  const blockedIds = new Set([node.id, node.parentId, ...getDescendantIds(node)])
  const options = flattenTree(project).filter((item) => !blockedIds.has(item.id))

  const handleConfirm = () => {
    if (isSubmitting) return

    if (!selectedParentId) {
      alert('Escolha um novo local para o item.')
      return
    }

    setIsSubmitting(true)
    onConfirm(node.id, selectedParentId)
    setSelectedParentId(null)
    window.setTimeout(() => setIsSubmitting(false), 600)
  }

  const handleClose = () => {
    setSelectedParentId(null)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Mover "{node.title}"</h3>
          <button type="button" className="close-button" onClick={handleClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <p className="move-hint">Escolha o novo local:</p>

        {options.length === 0 ? (
          <p className="empty-state">Não há outro local disponível para mover este item.</p>
        ) : (
          <div className="move-options" role="radiogroup" aria-label="Novo local">
            {options.map((option) => (
              <label
                key={option.id}
                className={`move-option ${selectedParentId === option.id ? 'move-option-selected' : ''}`}
                style={{ paddingLeft: `${option.depth * 16 + 12}px` }}
              >
                <input
                  type="radio"
                  name="new-parent"
                  value={option.id}
                  checked={selectedParentId === option.id}
                  onChange={() => setSelectedParentId(option.id)}
                />
                <span className="node-icon" aria-hidden="true">
                  {getNodeIcon(option.type)}
                </span>
                <span>{option.title}</span>
              </label>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={handleClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleConfirm}
            disabled={options.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Aguarde...' : 'Mover item'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MoveNodeModal
