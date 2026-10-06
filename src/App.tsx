import { useMemo, useState } from 'react'
import Graph from './Graph'
import { edges, kindLabels, nodes, sources } from './data'
import type { GraphEdge, GraphNode, NodeKind } from './types'

const FILTERS: Array<{ key: 'all' | NodeKind; label: string }> = [
  { key: 'all', label: 'ALL' },
  { key: 'album', label: 'RELEASES' },
  { key: 'track', label: 'TRACKS' },
  { key: 'method', label: 'METHODS' },
  { key: 'theme', label: 'THEMES' },
  { key: 'influence', label: 'INFLUENCES' },
]

function App() {
  const [filter, setFilter] = useState<'all' | NodeKind>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string>('kida')
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [showMethod, setShowMethod] = useState(false)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) ?? null : null

  const nodeRelations = useMemo(() => {
    if (!selectedNode) return []
    return edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
  }, [selectedNode])

  const resolveSource = (id: string) => sources.find((source) => source.id === id)
  const sourceIds = selectedEdge?.sourceIds ?? selectedNode?.sourceIds ?? []

  const selectNode = (node: GraphNode) => {
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
  }

  const selectEdge = (edge: GraphEdge) => {
    setSelectedEdgeId(edge.id)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setSelectedNodeId('kida')} aria-label="GraphHead home">
          <span>GRAPH</span><span className="brand-slash">/</span><span>HEAD</span>
        </button>
        <div className="project-note">
          <span>RADIOHEAD AS A SYSTEM OF CONNECTIONS</span>
          <span>1993—2016 / VERSION 0.1</span>
        </div>
        <nav className="utility-nav">
          <button onClick={() => setShowMethod(true)}>METHOD</button>
          <button onClick={() => setShowSources(true)}>SOURCES <sup>{String(sources.length).padStart(2, '0')}</sup></button>
        </nav>
      </header>

      <section className="lensbar" aria-label="Graph filters">
        <span className="lens-label">LENS</span>
        {FILTERS.map((item) => (
          <button
            key={item.key}
            className={filter === item.key ? 'active' : ''}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
        <div className="legend">
          <span><i className="legend-dot album" /> release</span>
          <span><i className="legend-dot track" /> track</span>
          <span><i className="legend-dot method" /> method</span>
          <span><i className="legend-dot influence" /> outside signal</span>
        </div>
      </section>

      <section className="workspace">
        <Graph
          nodes={nodes}
          edges={edges}
          filter={filter}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onNodeSelect={selectNode}
          onEdgeSelect={selectEdge}
        />

        <aside className="inspector" aria-live="polite">
          {selectedNode && !selectedEdge && (
            <>
              <div className="inspector-index">{String(nodes.findIndex((n) => n.id === selectedNode.id) + 1).padStart(2, '0')} / {nodes.length}</div>
              <div className={`type-stamp ${selectedNode.kind}`}>{kindLabels[selectedNode.kind]}</div>
              <p className="eyebrow">{selectedNode.eyebrow ?? `${selectedNode.year}`}</p>
              <h1>{selectedNode.label}</h1>
              <p className="node-summary">{selectedNode.summary}</p>

              <div className="source-strip">
                <span>SUPPORTED BY</span>
                <div>
                  {sourceIds.map(resolveSource).filter(Boolean).map((source) => (
                    <a key={source!.id} href={source!.url} target="_blank" rel="noreferrer">{source!.short}</a>
                  ))}
                </div>
              </div>

              <div className="relations-list">
                <div className="section-title"><span>RELATIONS</span><span>{String(nodeRelations.length).padStart(2, '0')}</span></div>
                {nodeRelations.slice(0, 8).map((relation) => {
                  const otherId = relation.from === selectedNode.id ? relation.to : relation.from
                  const other = nodes.find((node) => node.id === otherId)
                  if (!other) return null
                  return (
                    <button key={relation.id} onClick={() => selectEdge(relation)}>
                      <span className="relation-type">{relation.label}</span>
                      <span className="relation-target">{other.label}</span>
                      <span className="relation-arrow">↗</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {selectedEdge && (
            <>
              <button className="back-button" onClick={() => setSelectedEdgeId(null)}>← NODE</button>
              <div className="inspector-index">REL / {selectedEdge.type.toUpperCase()}</div>
              <p className="eyebrow">PROVENANCE</p>
              <h1 className="edge-title">{nodes.find((n) => n.id === selectedEdge.from)?.label}<br /><span>↘ {selectedEdge.label}</span><br />{nodes.find((n) => n.id === selectedEdge.to)?.label}</h1>
              <p className="node-summary">{selectedEdge.note}</p>
              <div className="source-strip edge-sources">
                <span>EVIDENCE</span>
                <div>
                  {selectedEdge.sourceIds.map(resolveSource).filter(Boolean).map((source) => (
                    <a key={source!.id} href={source!.url} target="_blank" rel="noreferrer">
                      <strong>{source!.short}</strong>
                      <small>{source!.title}</small>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      <footer className="footer-line">
        <span>DRAG TO MOVE · WHEEL TO ZOOM · CLICK A LINE FOR ITS SOURCE</span>
        <span>GRAPHHEAD / DIGITAL MUSIC HISTORY STUDY</span>
      </footer>

      {showSources && (
        <div className="modal-backdrop" onMouseDown={() => setShowSources(false)}>
          <section className="modal source-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">SOURCE PROTOCOL</span><h2>Evidence, not vibes.</h2></div>
              <button onClick={() => setShowSources(false)}>CLOSE ×</button>
            </div>
            <p className="modal-intro">Every interpretive edge in the graph carries its own provenance. Official sources establish chronology; academic sources support musical analysis; interviews support influence and process claims. Archive transcripts are marked as archives rather than silently promoted to scripture.</p>
            <div className="source-grid">
              {sources.map((source, index) => (
                <a href={source.url} target="_blank" rel="noreferrer" className="source-card" key={source.id}>
                  <span className={`tier ${source.tier}`}>{source.tier}</span>
                  <span className="source-no">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{source.title}</h3>
                  <p>{source.author && `${source.author} · `}{source.publisher}, {source.year}</p>
                  <small>{source.note}</small>
                </a>
              ))}
            </div>
          </section>
        </div>
      )}

      {showMethod && (
        <div className="modal-backdrop" onMouseDown={() => setShowMethod(false)}>
          <section className="modal method-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">HOW TO READ IT</span><h2>A timeline that refuses to stay linear.</h2></div>
              <button onClick={() => setShowMethod(false)}>CLOSE ×</button>
            </div>
            <div className="method-columns">
              <article><b>01 / X = TIME</b><p>Every node is anchored to an approximate year. The graph never loses chronology even when a relation jumps a decade.</p></article>
              <article><b>02 / Y = LAYER</b><p>Albums, tracks, musical methods, themes and outside influences occupy different semantic bands.</p></article>
              <article><b>03 / LINE = CLAIM</b><p>A line is not decoration. Click it: the inspector shows what the relation means and which source supports it.</p></article>
              <article><b>04 / FOCUS ≠ COMPLETENESS</b><p>The map concentrates on OK Computer, Kid A, In Rainbows and A Moon Shaped Pool. Other releases remain connective tissue, not a fake total history.</p></article>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
