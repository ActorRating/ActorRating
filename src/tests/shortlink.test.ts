import { createUniqueShortCode } from '@/lib/shortlink'
import { prisma } from '@/lib/prisma'

test('short code uniqueness', async () => {
  const code = await createUniqueShortCode()
  expect(code).toHaveLength(6)
  await prisma.shortLink.create({ data: { code, targetUrl: 'http://example.com' } })
  const code2 = await createUniqueShortCode()
  expect(code2).not.toBe(code)
})

