const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const isApiConfigured = Boolean(API_BASE_URL)

if (!isApiConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'API do PlanTree não configurada: defina VITE_API_BASE_URL em um arquivo .env (veja .env.example).',
  )
}

function mapNetworkError(err) {
  const message = err?.message ?? ''
  if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
    return new Error('Não foi possível conectar. Verifique sua internet e tente novamente.')
  }
  return err
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (err) {
    throw mapNetworkError(err)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Não foi possível concluir a operação.')
  }

  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
