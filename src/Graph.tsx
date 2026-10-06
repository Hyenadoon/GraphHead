import { useEffect, useMemo, useRef, useState } from 'react'
import type { GraphEdge, GraphNode, NodeKind } from './types'

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

const YEAR_START = 1993
const YEAR_END = 2016
const X_START = 220
const X_END = 3200
const LANE_Y = [170, 370, 590, 810, 1030, 1250, 1470, 1690]
const AXIS_Y = 1815

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
} as const

function yearToX(year: number) {
  const t = (year - YEAR_START) / (YEAR_END - YEAR_START)
  return X_START + t * (X_END - X_START)
}

function nodePoint(node: GraphNode): Point {
  return {
    x: yearToX(node.year + (node.offset ?? 0)),
    y: LANE_Y[node.lane] ?? LANE_Y[2],
  }
}

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
  const [view, setView] = useState<View>({ x: -270, y: -80, scale: 0.56 })
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  const pointMap = useMemo(() => new Map(nodes.map((node) => [node.id, nodePoint(node)])), [nodes])
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
    const nextScale = Math.min(1.45, Math.max(0.43, view.scale * (event.deltaY > 0 ? 0.9 : 1.1)))
    const graphX = (cursorX - view.x) / view.scale
    const graphY = (cursorY - view.y) / view.scale
    setView({
      scale: nextScale,
      x: cursorX - graphX * nextScale,
      y: cursorY - graphY * nextScale,
    })
  }

  const focusNode = (node: GraphNode) => {
    const p = pointMap.get(node.id)
    if (!p || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scale = Math.max(view.scale, 0.7)
    setView({
      scale,
      x: rect.width * 0.43 - p.x * scale,
      y: rect.height * 0.48 - p.y * scale,
    })
    onNodeSelect(node)
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
        x: rect.width * 0.43 - p.x * scale,
        y: rect.height * 0.48 - p.y * scale,
      }
    })
  }, [selectedNodeId, nodes, pointMap])

  const years = [1993, 1995, 1997, 2000, 2001, 2003, 2007, 2011, 2016]

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
          <text className="ghost-title" x="180" y="1570">RADIOHEAD</text>
          <text className="ghost-subtitle" x="188" y="1620">EXPECTATION / DISRUPTION / RETURN</text>

          {years.map((year) => {
            const x = yearToX(year)
            return (
              <g key={year} className="year-guide">
                <line x1={x} y1={95} x2={x} y2={AXIS_Y} />
                <text x={x + 12} y={AXIS_Y + 34}>{year}</text>
              </g>
            )
          })}

          <line className="time-axis" x1={X_START} y1={AXIS_Y} x2={X_END} y2={AXIS_Y} />
          <text className="axis-title" x={X_START} y={AXIS_Y + 70}>TIME →</text>

          <g className="lane-labels">
            <text x="38" y={LANE_Y[0] + 4}>METHOD</text>
            <text x="38" y={LANE_Y[1] + 4}>TRACK</text>
            <text x="38" y={LANE_Y[2] + 4}>RELEASE</text>
            <text x="38" y={LANE_Y[3] + 4}>TRACK</text>
            <text x="38" y={LANE_Y[4] + 4}>TRACK</text>
            <text x="38" y={LANE_Y[5] + 4}>PROCESS</text>
            <text x="38" y={LANE_Y[6] + 4}>THEME</text>
            <text x="38" y={LANE_Y[7] + 4}>OUTSIDE SIGNAL</text>
          </g>

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
                  className={`edge-hitgroup ${relationClass[edge.type]} ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${isConnected ? 'connected' : ''} ${!isVisible ? 'filtered' : ''}`}
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

      <div className="graph-coordinates">
        <span>X / CHRONOLOGY</span>
        <span>Y / SEMANTIC LAYER</span>
        <span>ZOOM {Math.round(view.scale * 100)}%</span>
      </div>
      <button className="reset-view" onClick={() => setView({ x: -270, y: -80, scale: 0.56 })}>RESET VIEW</button>
    </div>
  )
}
