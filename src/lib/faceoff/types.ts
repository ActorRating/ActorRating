export type FaceOffPublicEntity = {
  id: string
  type: "actor" | "performance"
  name: string
  imageUrl: string | null
  subtitle: string | null
  filmTitle: string | null
  year: number | null
  character: string | null
  href: string | null
}

export type FaceOffPublicMatchup = {
  id: string
  mode: "actor" | "performance"
  left: FaceOffPublicEntity
  right: FaceOffPublicEntity
  expiresAt: string
}

export type FaceOffChoiceSummary = {
  winner: FaceOffPublicEntity
  loser: FaceOffPublicEntity
  createdAt: string
}

export type FaceOffRankSnippet = {
  entityId: string
  name: string
  rank: number | null
  comparisons: number
  developing: boolean
}
