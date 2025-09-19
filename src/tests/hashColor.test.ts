import { hashColor } from '@/lib/hashColor'

test('hashColor deterministic', () => {
  const a = hashColor('Demo Actor')
  const b = hashColor('Demo Actor')
  const c = hashColor('Another Name')
  expect(a).toBe(b)
  expect(a).not.toBe(c)
  expect(a).toMatch(/^#[0-9a-f]{6}$/)
})

