export type NodeKind = 'album' | 'track' | 'method' | 'theme' | 'influence'

export type Source = {
  id: string
  short: string
  title: string
  author?: string
  year: number
  publisher: string
  url: string
  note: string
  tier: 'academic' | 'primary' | 'official' | 'secondary' | 'archive'
}

export type GraphNode = {
  id: string
  label: string
  kind: NodeKind
  year: number
  lane: number
  offset?: number
  featured?: boolean
  eyebrow?: string
  summary: string
  detail?: string
  sourceIds: string[]
}

export type RelationType = 'contains' | 'evolves' | 'uses' | 'influenced-by' | 'interprets' | 'echoes'

export type GraphEdge = {
  id: string
  from: string
  to: string
  type: RelationType
  label: string
  sourceIds: string[]
  note: string
}
