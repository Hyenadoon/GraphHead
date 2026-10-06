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

const PATHS = [
  {
    title: 'THE RUPTURE',
    note: 'How the post-OK Computer crisis turns into a new production grammar.',
    nodeIds: ['okc', 'kida', 'editing', 'autechre', 'aphex'],
  },
  {
    title: 'RHYTHM MACHINE',
    note: 'Follow rhythmic instability from Kid A into the later mature catalogue.',
    nodeIds: ['idioteque', 'rhythm', '15step', 'bloom'],
  },
  {
    title: 'JAZZ LEAK',
    note: 'The 2000–01 detour is not just electronics: trace Mingus and Alice Coltrane into Kid A / Amnesiac.',
    nodeIds: ['mingus', 'alice-coltrane', 'kida', 'nationalanthem', 'amnesiac', 'glasshouse'],
  },
  {
    title: 'BACK TO THE BODY',
    note: 'A route from over-analysis toward the more immediate In Rainbows sessions.',
    nodeIds: ['httt', 'rainbows', 'immediacy', '15step', 'weirdfishes', 'mortality', 'intimacy'],
  },
  {
    title: 'HOW TO BREAK A ROCK SONG',
    note: 'A compact theory route through form, meter, timbre and harmony: the mechanics behind the “Radiohead feeling”.',
    nodeIds: ['formal', 'terminal-climax', 'throughcomposed', 'rhythm', 'oddmeter', 'timbre', 'source-deform', 'harmony', 'absenttonic'],
  },
  {
    title: 'PUBLIC PANIC / PRIVATE PANIC',
    note: 'Watch the scale of anxiety move from systems and war toward bodies, relationships, loss and ecology.',
    nodeIds: ['technology', 'authority', 'climate', 'mortality', 'intimacy', 'loss', 'fear'],
  },
]

function App() {
  const [filter, setFilter] = useState<'all' | NodeKind>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string>('kida')
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [showPaths, setShowPaths] = useState(false)
  const [query, setQuery] = useState('')

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedEdge = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) ?? null : null

  const nodeRelations = useMemo(() => {
    if (!selectedNode) return []
    return edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id)
  }, [selectedNode])

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return nodes
      .filter((node) => {
        const haystack = [node.label, node.summary, node.detail ?? '', ...(node.readMore ?? [])].join(' ').toLowerCase()
        return haystack.includes(needle)
      })
      .slice(0, 9)
  }, [query])

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
          <span>1993—2016 / VERSION 0.3</span>
        </div>
        <nav className="utility-nav">
          <button onClick={() => setShowMethod(true)}>METHOD</button>
          <button onClick={() => setShowPaths(true)}>PATHS</button>
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
        <div className="node-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="FIND A NODE…"
            aria-label="Find a node"
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((node) => (
                <button key={node.id} onClick={() => { selectNode(node); setQuery('') }}>
                  <span>{node.label}</span>
                  <small>{node.year} / {node.kind}</small>
                </button>
              ))}
            </div>
          )}
        </div>
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
              {selectedNode.detail && <p className="node-detail">{selectedNode.detail}</p>}
              {selectedNode.readMore && selectedNode.readMore.length > 0 && (
                <div className="reading-notes">
                  <div className="section-title"><span>READING NOTES</span><span>{String(selectedNode.readMore.length).padStart(2, '0')}</span></div>
                  {selectedNode.readMore.map((paragraph, index) => (
                    <p key={index}><sup>{String(index + 1).padStart(2, '0')}</sup>{paragraph}</p>
                  ))}
                </div>
              )}

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
                {nodeRelations.slice(0, 14).map((relation) => {
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
        <span>DRAG · WHEEL TO ZOOM · SEARCH A NODE · CLICK A LINE FOR EVIDENCE</span>
        <span>GRAPHHEAD / DIGITAL MUSIC HISTORY STUDY</span>
      </footer>

      {showPaths && (
        <div className="modal-backdrop" onMouseDown={() => setShowPaths(false)}>
          <section className="modal path-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">GUIDED READING</span><h2>Four ways into the map.</h2></div>
              <button onClick={() => setShowPaths(false)}>CLOSE ×</button>
            </div>
            <p className="modal-intro">The graph is intentionally non-linear, which is useful until it becomes a decorative bowl of spaghetti. These short trails give you a point of entry without turning the project back into a chapter-by-chapter textbook.</p>
            <div className="path-grid">
              {PATHS.map((path, index) => (
                <article className="path-card" key={path.title}>
                  <span className="path-no">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{path.title}</h3>
                  <p>{path.note}</p>
                  <div className="path-nodes">
                    {path.nodeIds.map((id, nodeIndex) => {
                      const node = nodes.find((item) => item.id === id)
                      if (!node) return null
                      return (
                        <button key={id} onClick={() => { selectNode(node); setShowPaths(false) }}>
                          <span>{nodeIndex + 1}</span>{node.label}
                        </button>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

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
