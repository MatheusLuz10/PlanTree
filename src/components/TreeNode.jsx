import { useMemo } from 'react'
import { STATUS_META, getNodeIcon, getNodeTypeLabel } from '../utils/treeUtils'
import { calculateProgress, formatPercentage } from '../utils/progressService'

function highlightTitle(title, term) {
  if (!term) return title

  const lower = title.toLowerCase()
  const index = lower.indexOf(term.toLowerCase())
  if (index === -1) return title

  return (
    <>
      {title.slice(0, index)}
      <mark>{title.slice(index, index + term.length)}</mark>
      {title.slice(index + term.length)}
    </>
  )
}

function TreeNode({
  node,
  level = 0,
  expandedMap,
  onToggleExpand,
  onSelectNode,
  selectedId,
  searchTerm = '',
}) {
  const forceExpand = Boolean(searchTerm)
  const isExpanded = forceExpand || (expandedMap[node.id] ?? true)
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.id

  const progress = useMemo(() => (hasChildren ? calculateProgress(node) : null), [node, hasChildren])

  return (
    <div className="tree-node-shell">
      <div
        className={`tree-node ${isSelected ? 'tree-node-selected' : ''}`}
        style={{ paddingLeft: `${level * 18 + 10}px` }}
      >
        <button
          type="button"
          className="tree-toggle"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          aria-label={hasChildren ? `Expandir ${node.title}` : 'Sem filhos'}
          aria-expanded={hasChildren ? isExpanded : undefined}
          disabled={!hasChildren}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
        </button>

        <button
          type="button"
          className="tree-node-main"
          onClick={() => onSelectNode(node)}
        >
          <span className="node-icon" aria-hidden="true">
            {getNodeIcon(node.type)}
          </span>

          <span className={`status-indicator ${STATUS_META[node.status]?.className ?? 'status-pending'}`}>
            {STATUS_META[node.status]?.icon ?? '○'}
          </span>

          <span className="node-text">
            <span className="node-title">{highlightTitle(node.title, searchTerm)}</span>
            <span className="node-meta">
              {getNodeTypeLabel(node.type)}
              {hasChildren ? ` · ${node.children.length} subtarefa${node.children.length > 1 ? 's' : ''}` : ''}
            </span>
          </span>

          {progress && (
            <span className="tree-node-progress" aria-label={`Progresso: ${formatPercentage(progress.percentage)}`}>
              <span className="mini-bar">
                <span className="mini-bar-fill" style={{ width: `${progress.percentage}%` }} />
              </span>
              <span className="mini-bar-label">{formatPercentage(progress.percentage)}</span>
            </span>
          )}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedMap={expandedMap}
              onToggleExpand={onToggleExpand}
              onSelectNode={onSelectNode}
              selectedId={selectedId}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default TreeNode
