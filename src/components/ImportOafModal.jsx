import { useEffect, useState } from 'react'
import { parseOAF } from '../lib/oaf/parser'

const PLACEHOLDER = `PROJETO: Meu Projeto

ETAPA: Planejamento

ATIVIDADE: Definir escopo
SUBTAREFA: Listar objetivos
SUBTAREFA: Levantar riscos`

function ImportOafModal({ isOpen, onClose, onImport }) {
  const [text, setText] = useState('')
  const [errors, setErrors] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setText('')
      setErrors([])
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const { project, errors: parseErrors } = parseOAF(text)
    if (parseErrors.length > 0) {
      setErrors(parseErrors)
      return
    }

    setErrors([])
    setIsSubmitting(true)
    await onImport(project)
    setIsSubmitting(false)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Importar estrutura (OAF)</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Cole o texto no padrão OAF
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER}
              rows="12"
              spellCheck="false"
            />
          </label>

          {errors.length > 0 && (
            <div className="auth-error" role="alert">
              <p>Não foi possível importar — corrija e tente novamente:</p>
              <ul>
                {errors.map((err) => (
                  <li key={`${err.line}-${err.message}`}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Importando...' : 'Validar e importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ImportOafModal
