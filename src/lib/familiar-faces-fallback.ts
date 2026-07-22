import { createActorSlug } from "@/lib/createSlug"

/** Curated faces when DB/API is unavailable — TMDB profile paths. */
export const FAMILIAR_FACES_FALLBACK: Array<{
  name: string
  profilePath: string
}> = [
  { name: "Cillian Murphy", profilePath: "/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg" },
  { name: "Leonardo DiCaprio", profilePath: "/mkdRcVIQl4WZhDf1vXKWTD7HZrZ.jpg" },
  { name: "Florence Pugh", profilePath: "/1Uvfh7xL4U2evkhs0M3C7BbBYFf.jpg" },
  { name: "Robert De Niro", profilePath: "/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg" },
  { name: "Zendaya", profilePath: "/1qup8tSt95HLbcy2c2xrx4iJNxv.jpg" },
  { name: "Christian Bale", profilePath: "/7Pxez9J8fuPd2Mn9kex13YALrCQ.jpg" },
  { name: "Meryl Streep", profilePath: "/g5cVxQBAQ3AXt3LhdBXtbbN47Uc.jpg" },
  { name: "Al Pacino", profilePath: "/m8HAAjq1T75JypKk0v1FFQn4ysZ.jpg" },
  { name: "Timothée Chalamet", profilePath: "/axENiFIrSz5B7UuWkMT7PDe7CaO.jpg" },
  { name: "Emma Stone", profilePath: "/cZ8a3QvAnj2cgcgVL6g4XaqPzpL.jpg" },
  { name: "Denzel Washington", profilePath: "/393wX9AGWpseVqojQDPLy3bTBia.jpg" },
  { name: "Cate Blanchett", profilePath: "/vUuEHiAR0eD3XEJhg2DWIjymUAA.jpg" },
  { name: "Heath Ledger", profilePath: "/AdWKVqyWpkYSfKE5Gb2qn8JzHni.jpg" },
  { name: "Joaquin Phoenix", profilePath: "/u38k3hQBDwNX0VA22aQceDp9Iyv.jpg" },
  { name: "Brad Pitt", profilePath: "/m09Y1YfPPeNYYUSHnnVqahkrC1o.jpg" },
  { name: "Daniel Day-Lewis", profilePath: "/3kNA9VcmymoEwT0btQ4bvMYxzcP.jpg" },
  { name: "Anthony Hopkins", profilePath: "/iaf7SHSkGDpnyrDh1Jolilwk2TD.jpg" },
  { name: "Matt Damon", profilePath: "/aCvBXTAR9B1qRjIRzMBYhhbm1fR.jpg" },
  { name: "Paul Mescal", profilePath: "/hPcyXGZ0qNL9Sm2LKlDzO54Pa8g.jpg" },
  { name: "Austin Butler", profilePath: "/atdAs4pFGjUQ4m2W8kJYly7N6cC.jpg" },
  { name: "Demi Moore", profilePath: "/wApParZYBDi4yxekjfxjKEifJYh.jpg" },
  { name: "Colin Farrell", profilePath: "/5FdalJbrbZ5UCsED5rFrXpvbqJa.jpg" },
  { name: "Javier Bardem", profilePath: "/zfRID0jx8DKBluPGU9xtk9sZWUt.jpg" },
  { name: "Viola Davis", profilePath: "/xDssw6vpYNRjsybvMPRE30e0dPN.jpg" },
]

export type FamiliarFaceActor = {
  id: string
  name: string
  imageUrl: string | null
  slug: string | null
}

export function familiarFacesFallbackActors(): FamiliarFaceActor[] {
  return FAMILIAR_FACES_FALLBACK.map(({ name, profilePath }) => {
    const slug = createActorSlug(name)
    return {
      id: slug,
      name,
      slug,
      imageUrl: `https://image.tmdb.org/t/p/w185${profilePath}`,
    }
  })
}
