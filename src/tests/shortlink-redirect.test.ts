import { prisma } from '@/lib/prisma'

test('shortlink click count increments (db-level)', async () => {
  const link = await prisma.shortLink.create({ data: { code: 'TeSt12', targetUrl: 'http://localhost:3000/r/demo-123' } })
  await prisma.shareClick.create({ data: { shortLinkId: link.code, referer: 'test', userAgent: 'jest', ipHash: 'x' } })
  await prisma.shortLink.update({ where: { code: link.code }, data: { clickCount: { increment: 1 } } })
  const updated = await prisma.shortLink.findUnique({ where: { code: link.code } })
  expect(updated?.clickCount).toBe(1)
})

