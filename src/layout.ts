import type { GraphNode } from './types'

export type Point = { x: number; y: number }
export type EraBand = { year: number; start: number; end: number; center: number }
export type LayoutRow = { id: string; label: string; y: number; group: string }
export type GraphLayout = {
  points: Map<string, Point>
  eras: EraBand[]
  rows: LayoutRow[]
  axisY: number
  endX: number
  height: number
}

/**
 * The year-axis is ordered but deliberately NOT metrical. Each release era
 * gets the amount of room needed to read its labels. Context nodes inherit the
 * period they help explain, not their subject's date of birth.
 */
const RELEASE_YEARS = [1993, 1995, 1997, 2000, 2001, 2003, 2007, 2011, 2016] as const
const MIN_ERA_WIDTH = [960, 990, 2600, 2850, 2050, 1980, 3050, 1750, 2750] as const
const ORIGIN_X = 290
const COLUMN_STEP = 490
const ROW_STEP = 144
const FIRST_ROW_Y = 185

const ROW_DEFS: Array<{ id: string; label: string; group: string }> = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `analysis-${i}`, label: `METHOD / ${String(i + 1).padStart(2, '0')}`, group: 'analysis' })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `track-upper-${i}`, label: `TRACK / ${String(i + 1).padStart(2, '0')}`, group: 'track' })),
  { id: 'releases', label: 'RELEASES', group: 'album' },
  ...Array.from({ length: 4 }, (_, i) => ({ id: `track-lower-${i}`, label: `TRACK / ${String(i + 5).padStart(2, '0')}`, group: 'track' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `process-${i}`, label: `PROCESS / ${String(i + 1).padStart(2, '0')}`, group: 'process' })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `theme-${i}`, label: `THEME / ${String(i + 1).padStart(2, '0')}`, group: 'theme' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `influence-${i}`, label: `INFLUENCE / ${String(i + 1).padStart(2, '0')}`, group: 'influence' })),
]

const ROWS: LayoutRow[] = ROW_DEFS.map((row, i) => ({ ...row, y: FIRST_ROW_Y + i * ROW_STEP }))
const AXIS_Y = ROWS[ROWS.length - 1].y + 116

function eraIndex(year: number): number {
  let selected = 0
  for (let i = 1; i < RELEASE_YEARS.length; i++) {
    if (Math.abs(year - RELEASE_YEARS[i]) < Math.abs(year - RELEASE_YEARS[selected])) selected = i
  }
  return selected
}

function bucket(node: GraphNode): string {
  if (node.kind === 'album') return 'album'
  if (node.kind === 'track') return node.lane === 1 ? 'track-upper' : 'track-lower'
  if (node.kind === 'method') return node.lane === 5 ? 'process' : 'analysis'
  return node.kind
}

const BUCKET_ROWS: Record<string, number[]> = {
  analysis: [0, 1, 2, 3, 4, 5],
  'track-upper': [6, 7, 8, 9],
  album: [10],
  'track-lower': [11, 12, 13, 14],
  process: [15, 16],
  theme: [17, 18, 19],
  influence: [20, 21],
}

export function createGraphLayout(nodes: GraphNode[]): GraphLayout {
  const byEra = RELEASE_YEARS.map(() => new Map<string, GraphNode[]>())
  for (const node of nodes) {
    const key = bucket(node)
    const area = byEra[eraIndex(node.year)]
    const group = area.get(key) ?? []
    group.push(node)
    area.set(key, group)
  }

  const eras: EraBand[] = []
  let cursor = ORIGIN_X
  byEra.forEach((area, i) => {
    const columnDemand = Math.max(
      1,
      ...[...area.entries()].map(([group, groupNodes]) =>
        Math.ceil(groupNodes.length / BUCKET_ROWS[group].length),
      ),
    )
    const width = Math.max(MIN_ERA_WIDTH[i], 480 + columnDemand * COLUMN_STEP)
    eras.push({ year: RELEASE_YEARS[i], start: cursor, end: cursor + width, center: cursor + width / 2 })
    cursor += width + 130
  })

  const points = new Map<string, Point>()
  byEra.forEach((area, index) => {
    const era = eras[index]
    for (const [group, groupNodes] of area) {
      if (group === 'album') {
        groupNodes.forEach((node) => points.set(node.id, { x: era.center, y: ROWS[10].y }))
        continue
      }

      const rows = BUCKET_ROWS[group]
      // Only labels in a given row must never collide. A full column of
      // different rows may still be staggered for a more organic map.
      const ordered = [...groupNodes].sort((a, b) => a.year - b.year || a.label.localeCompare(b.label))
      const numberOfColumns = Math.ceil(ordered.length / rows.length)
      const span = (numberOfColumns - 1) * COLUMN_STEP
      const columnStart = era.center - span / 2

      ordered.forEach((node, nodeIndex) => {
        const column = Math.floor(nodeIndex / rows.length)
        const rowInGroup = nodeIndex % rows.length
        const rowIndex = rows[rowInGroup]
        const stagger = ((rowInGroup % 4) - 1.5) * 76
        points.set(node.id, {
          x: columnStart + column * COLUMN_STEP + stagger,
          y: ROWS[rowIndex].y,
        })
      })
    }
  })

  return { points, eras, rows: ROWS, axisY: AXIS_Y, endX: cursor, height: AXIS_Y + 95 }
}
