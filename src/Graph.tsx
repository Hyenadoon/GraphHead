import { useEffect, useMemo, useRef, useState } from 'react'
import type { GraphEdge, GraphNode, NodeKind } from './types'
import { createGraphLayout } from './layout'

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  filter: 'all' | NodeKind
  selectedNodeId: string
  selectedEdgeId: string | null
  onNodeSelect: (node: GraphNode) => void
  onEdgeSelect: (edge: GraphEdge) => void
}

type View = { x: number; y: number; scale: number }
type Point = { x: number; y: number }

const kindClass: Record<NodeKind, string> = {
  album: 'album',
  track: 'track',
  method: 'method',
  theme: 'theme',
  influence: 'influence',
}

const relationClass = {
  contains: 'contains',
  evolves: 'evolves',
  uses: 'uses',
  'influenced-by': 'influenced-by',
  interprets: 'interprets',
  echoes: 'echoes',
  subtype: 'subtype',
} as const

function curve(a: Point, b: Point) {
  const dx = b.x - a.x
  const bend = Math.max(55, Math.min(220, Math.abs(dx) * 0.28))
  const c1 = { x: a.x + Math.sign(dx || 1) * bend, y: a.y }
  const c2 = { x: b.x - Math.sign(dx || 1) * bend, y: b.y }
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`
}

export default function Graph({ nodes, edges, filter, selectedNodeId, selectedEdgeId, onNodeSelect, onEdgeSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 0.66 })
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const layout = useMemo(() => createGraphLayout(nodes), [nodes])
  const pointMap = layout.points
  const connectedIds = useMemo(() => {
    const id = hoveredNodeId ?? selectedNodeId
    const set = new Set<string>([id])
    edges.forEach((edge) => {
      if (edge.from === id) set.add(edge.to)
      if (edge.to === id) set.add(edge.from)
    })
    return set
  }, [edges, hoveredNodeId, selectedNodeId])

  const visibleNodes = useMemo(() => {
    if (filter === 'all') return new Set(nodes.map((node) => node.id))
    const selectedOfKind = nodes.filter((node) => node.kind === filter).map((node) => node.id)
    const set = new Set(selectedOfKind)
    edges.forEach((edge) => {
      if (set.has(edge.from)) set.add(edge.to)
      if (set.has(edge.to)) set.add(edge.from)
    })
    return set
  }, [filter, nodes, edges])

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest('[data-interactive="true"]')) return
    svgRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    const nextX = drag.viewX + dx
    const nextY = drag.viewY + dy
    setView((prev) => ({ ...prev, x: nextX, y: nextY }))
  }

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null
    try { svgRef.current?.releasePointerCapture(event.pointerId) } catch { /* no-op */ }
  }

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top
    const nextScale = Math.min(1.7, Math.max(0.16, view.scale * (event.deltaY > 0 ? 0.9 : 1.1)))
    const graphX = (cursorX - view.x) / view.scale
    const graphY = (cursorY - view.y) / view.scale
    setView({
      scale: nextScale,
      x: cursorX - graphX * nextScale,
      y: cursorY - graphY * nextScale,
    })
  }

  const centerNode = (node: GraphNode, desiredScale = 0.76) => {
    const p = pointMap.get(node.id)
    const rect = svgRef.current?.getBoundingClientRect()
    if (!p || !rect) return
    setView({
      scale: desiredScale,
      x: rect.width * 0.44 - p.x * desiredScale,
      y: rect.height * 0.50 - p.y * desiredScale,
    })
  }

  const focusNode = (node: GraphNode) => {
    centerNode(node, Math.max(view.scale, 0.76))
    onNodeSelect(node)
  }

  const fitHeight = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    const p = pointMap.get(selectedNodeId)
    if (!rect || !p) return
    const scale = Math.min(0.72, Math.max(0.16, (rect.height - 90) / layout.height))
    setView({
      scale,
      x: rect.width * 0.45 - p.x * scale,
      y: rect.height * 0.52 - p.y * scale,
    })
  }

  useEffect(() => {
    const node = nodes.find((item) => item.id === selectedNodeId)
    const p = node ? pointMap.get(node.id) : null
    const svg = svgRef.current
    if (!p || !svg) return

    const rect = svg.getBoundingClientRect()
    setView((prev) => {
      const scale = Math.max(prev.scale, 0.66)
      return {
        scale,
        x: rect.width * 0.44 - p.x * scale,
        y: rect.height * 0.50 - p.y * scale,
      }
    })
  }, [selectedNodeId, nodes, pointMap])

  return (
    <div className="graph-wrap">
      <svg
        ref={svgRef}
        className="graph-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <filter id="roughen" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" />
          </filter>
          <marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 z" className="edge-arrow" />
          </marker>
        </defs>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <g className="era-sections" aria-hidden="true">
            {layout.eras.map((era, index) => (
              <rect
                key={era.year}
                className={index % 2 === 0 ? 'era-shade' : 'era-shade alternate'}
                x={era.start - 65}
                y={80}
                width={era.end - era.start + 130}
                height={layout.axisY - 35}
              />
            ))}
          </g>

          <g className="lane-rules" aria-hidden="true">
            {layout.rows.map((row, index) => (
              <line
                key={row.id}
                className={index === 0 || layout.rows[index - 1].group !== row.group ? 'group-start' : ''}
                x1={85}
                x2={layout.endX}
                y1={row.y + 64}
                y2={row.y + 64}
              />
            ))}
          </g>

          <text className="ghost-title" x={260} y={layout.rows[17].y - 65}>RADIOHEAD</text>
          <text className="ghost-subtitle" x={268} y={layout.rows[17].y - 18}>EXPECTATION / DISRUPTION / RETURN</text>

          {layout.eras.map((era) => (
            <g key={era.year} className="year-guide">
              <line x1={era.center} y1={90} x2={era.center} y2={layout.axisY} />
              <text x={era.center - 18} y={layout.axisY + 31}>{era.year}</text>
            </g>
          ))}

          <line className="time-axis" x1={layout.eras[0].start} y1={layout.axisY} x2={layout.endX - 130} y2={layout.axisY} />
          <text className="axis-title" x={layout.eras[0].start} y={layout.axisY + 76}>TIME → ERA WIDTH REFLECTS CONTENT DENSITY, NOT YEARS ELAPSED</text>

          <g className="edges-layer">
            {edges.map((edge) => {
              const from = pointMap.get(edge.from)
              const to = pointMap.get(edge.to)
              if (!from || !to) return null
              const isSelected = selectedEdgeId === edge.id
              const isHovered = hoveredEdgeId === edge.id
              const isConnected = edge.from === (hoveredNodeId ?? selectedNodeId) || edge.to === (hoveredNodeId ?? selectedNodeId)
              const isVisible = visibleNodes.has(edge.from) && visibleNodes.has(edge.to)
              return (
                <g
                  key={edge.id}
                  data-interactive="true"
                  className={`edge-hitgroup ${relationClass[edge.type]} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isConnected ? 'connected' : 'muted'} ${!isVisible ? 'filtered' : ''}`}
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  onClick={(event) => { event.stopPropagation(); onEdgeSelect(edge) }}
                >
                  <path className="edge-hit" d={curve(from, to)} />
                  <path className="edge-line" d={curve(from, to)} markerEnd={edge.type === 'evolves' || edge.type === 'influenced-by' ? 'url(#arrow)' : undefined} />
                </g>
              )
            })}
          </g>

          <g className="nodes-layer">
            {nodes.map((node) => {
              const p = pointMap.get(node.id)!
              const selected = selectedNodeId === node.id
              const connected = connectedIds.has(node.id)
              const visible = visibleNodes.has(node.id)
              const fade = !connected && hoveredNodeId !== null
              return (
                <g
                  key={node.id}
                  transform={`translate(${p.x} ${p.y})`}
                  data-interactive="true"
                  className={`graph-node ${kindClass[node.kind]} ${node.featured ? 'featured' : ''} ${selected ? 'selected' : ''} ${fade ? 'deemphasized' : ''} ${!visible ? 'filtered' : ''}`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(event) => { event.stopPropagation(); focusNode(node) }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, ${node.kind}, ${node.year}`}
                >
                  {node.kind === 'album' && (
                    <>
                      <circle className="node-orbit outer" r={node.featured ? 54 : 38} />
                      <circle className="node-orbit inner" r={node.featured ? 39 : 25} />
                      <circle className="node-core" r={node.featured ? 10 : 7} />
                    </>
                  )}
                  {node.kind === 'track' && <rect className="track-mark" x="-7" y="-7" width="14" height="14" transform="rotate(45)" />}
                  {node.kind === 'method' && <path className="method-mark" d="M-12 0 H12 M0 -12 V12" />}
                  {node.kind === 'theme' && <circle className="theme-mark" r="9" />}
                  {node.kind === 'influence' && <path className="influence-mark" d="M-11 -7 L12 0 L-11 7 Z" />}

                  <g className="node-label" transform={`translate(${node.kind === 'album' ? (node.featured ? 69 : 50) : 20} -2)`}>
                    {node.eyebrow && <text className="node-kicker" y="-18">{node.eyebrow}</text>}
                    <text className="node-name" y="2">{node.label}</text>
                    <text className="node-meta" y="20">{node.year} / {node.kind.toUpperCase()}</text>
                  </g>
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      <nav className="era-nav" aria-label="Jump to release year">
        <span>JUMP /</span>
        {layout.eras.map((era) => (
          <button
            key={era.year}
            title={String(era.year)}
            className={nodes.some((node) => node.id === selectedNodeId && node.kind === 'album' && node.year === era.year) ? 'active' : ''}
            onClick={() => {
              const release = nodes.find((node) => node.kind === 'album' && node.year === era.year)
              if (release) focusNode(release)
            }}
          >{era.year}</button>
        ))}
      </nav>
      <div className="lane-rail" aria-hidden="true">
        {layout.rows.map((row, index) => (
          <span
            key={row.id}
            className={index === 0 || layout.rows[index - 1].group !== row.group ? 'major' : ''}
            style={{ top: view.y + row.y * view.scale }}
          >{row.label}</span>
        ))}
      </div>
      <div className="graph-coordinates">
        <span>X / DENSITY-SPACED TIME</span>
        <span>Y / 22 SEMANTIC ROWS</span>
        <span>ZOOM {Math.round(view.scale * 100)}%</span>
      </div>
      <div className="graph-tools">
        <button onClick={fitHeight}>FIT HEIGHT</button>
        <button onClick={() => {
          const node = nodes.find((item) => item.id === selectedNodeId)
          if (node) centerNode(node)
        }}>FOCUS</button>
      </div>
    </div>
  )
}
