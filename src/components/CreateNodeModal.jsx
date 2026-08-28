import { useEffect, useState } from 'react'

function CreateNodeModal({ isOpen, onClose, onSubmit, targetNode, mode = 'project' }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: mode === 'project' ? 'project' : 'folder',
    alreadyCompleted: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // O modal nunca desmonta (só alterna isOpen), então o estado precisa ser
  // reiniciado a cada abertura — senão um "type" escolhido (ou o valor da
  // primeira montagem) vaza para a próxima criação com um `mode` diferente.
  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        description: '',
        type: mode === 'project' ? 'project' : 'folder',
        alreadyCompleted: false,
      })
      setIsSubmitting(false)
    }
  }, [isOpen, mode])

  if (!isOpen) return null

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (isSubmitting) return

    if (!form.title.trim()) {
      alert('O nome é obrigatório.')
      return
    }

    setIsSubmitting(true)
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      status: form.alreadyCompleted ? 'completed' : 'pending',
      parentId: targetNode?.id ?? null,
    })
    // Se o formulário continuar aberto (ex.: validação do pai falhou), o botão
    // não pode ficar travado para sempre — apenas o clique duplo imediato importa.
    window.setTimeout(() => setIsSubmitting(false), 600)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>
            {mode === 'project'
              ? 'Novo projeto'
              : targetNode
                ? `Adicionar subtarefa em "${targetNode.title}"`
                : 'Adicionar item'}
          </h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Nome
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder={mode === 'project' ? 'Meu projeto' : 'Nova pasta'}
            />
          </label>

          <label>
            Descrição
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Descrição opcional"
              rows="4"
            />
          </label>

          {mode !== 'project' && (
            <label>
              Tipo
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="folder">Nova pasta</option>
                <option value="task">Nova atividade</option>
              </select>
            </label>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="alreadyCompleted"
              checked={form.alreadyCompleted}
              onChange={handleChange}
            />
            Já está concluída
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Aguarde...' : mode === 'project' ? 'Criar projeto' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateNodeModal
