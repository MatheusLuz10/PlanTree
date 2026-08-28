function BottomNavigation({ onAddNode, currentTab = 'home', onSelectTab }) {
  const items = [
    { id: 'home', label: 'Início', icon: '🏠' },
    { id: 'tree', label: 'Árvore', icon: '🌳' },
    { id: 'progress', label: 'Progresso', icon: '📊' },
    { id: 'settings', label: 'Ajustes', icon: '⚙' },
  ]

  const renderItem = (item) => (
    <button
      key={item.id}
      type="button"
      className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
      aria-current={currentTab === item.id ? 'page' : undefined}
      onClick={() => {
        if (item.id === 'home' || item.id === 'tree' || item.id === 'progress') {
          onSelectTab(item.id)
        }
      }}
      aria-label={item.label}
    >
      <span>{item.icon}</span>
      <small>{item.label}</small>
    </button>
  )

  return (
    <nav className="bottom-nav" aria-label="Navegação inferior">
      {items.slice(0, 2).map(renderItem)}
      <span className="nav-fab-slot" aria-hidden="true" />
      {items.slice(2).map(renderItem)}

      <button type="button" className="nav-fab" onClick={onAddNode} aria-label="Adicionar novo item">
        +
      </button>
    </nav>
  )
}

export default BottomNavigation
