import { renderShareTemplate } from '@/lib/imageTemplates/shareTemplate'

test('renderShareTemplate produces image', async () => {
  const res = renderShareTemplate({ actorName: 'Demo Actor', roleName: 'Lead', score: 88, size: 'og' })
  const buf = Buffer.from(await res.arrayBuffer())
  expect(buf.length).toBeGreaterThan(1024)
})

