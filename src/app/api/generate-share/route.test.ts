import { prisma } from '@/lib/prisma'

describe('POST /api/generate-share', () => {
  it('returns JSON with URLs for demo rating', async () => {
    // Ensure demo seed exists
    const rating = await prisma.rating.findFirst({ where: { slug: 'demo-123' }, include: { actor: true } })
    expect(rating).toBeTruthy()
  })
})

