import { renderShareTemplate } from '@/lib/imageTemplates/shareTemplate'

test('og template renders > 10KB', async () => {
  const res = renderShareTemplate({ actorName: 'Demo Actor', score: 88, size: 'og' })
  const buf = Buffer.from(await res.arrayBuffer())
  expect(buf.length).toBeGreaterThan(10 * 1024)
})

