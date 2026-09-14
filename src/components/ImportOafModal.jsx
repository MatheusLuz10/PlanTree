import { useEffect, useState } from 'react'
import { parseOAF } from '../lib/oaf/parser'

const PLACEHOLDER = `PROJETO: Meu Projeto

ETAPA: Planejamento

ATIVIDADE: Definir escopo
SUBTAREFA: Listar objetivos
SUBTAREFA: Levantar riscos`

// Prompt pronto para colar no ChatGPT/Claude: explica o padrão OAF e pede a
// saída já no formato que o parser (src/lib/oaf/parser.js) reconhece.
const OAF_PROMPT = `Gere a estrutura do meu projeto usando exatamente este formato de texto (padrão OAF), sem nenhum texto além dele:

PROJETO: Nome do projeto

ETAPA: Nome da etapa

ATIVIDADE: Nome da atividade
SUBTAREFA: Nome da subtarefa
SUBTAREFA: Nome da subtarefa

ETAPA: Nome da próxima etapa

ATIVIDADE: Nome da atividade
SUBTAREFA: Nome da subtarefa

Regras:
- Cada linha começa com PROJETO:, ETAPA:, ATIVIDADE: ou SUBTAREFA:, seguido do nome.
- Só pode haver um PROJETO, e ele vem primeiro.
- Pode haver várias ETAPAS; cada ETAPA pode ter várias ATIVIDADES; cada ATIVIDADE pode ter várias SUBTAREFAS.
- Não use markdown, numeração, marcadores (-, *) nem nenhum texto fora desse formato.

Aqui está o que eu quero organizar: [descreva seu projeto aqui]`

function ImportOafModal({ isOpen, onClose, onImport }) {
  const [text, setText] = useState('')
  const [errors, setErrors] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'error'

  useEffect(() => {
    if (isOpen) {
      setText('')
      setErrors([])
      setIsSubmitting(false)
      setShowExample(false)
      setCopyState('idle')
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

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(OAF_PROMPT)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
    window.setTimeout(() => setCopyState('idle'), 2000)
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

        <div className="oaf-example-toggle">
          <button type="button" className="secondary-button" onClick={() => setShowExample((v) => !v)}>
            {showExample ? 'Ocultar exemplo para IA' : 'Ver exemplo para copiar (usar no ChatGPT/Claude)'}
          </button>
        </div>

        {showExample && (
          <div className="oaf-example">
            <p>
              Copie e cole isto numa conversa com o ChatGPT ou Claude, complete a última linha descrevendo seu
              projeto, e cole a resposta dele no campo abaixo.
            </p>
            <pre>{OAF_PROMPT}</pre>
            <button type="button" className="secondary-button" onClick={handleCopyPrompt}>
              {copyState === 'copied' ? 'Copiado!' : copyState === 'error' ? 'Não foi possível copiar' : 'Copiar exemplo'}
            </button>
          </div>
        )}

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
