import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter } from '../scripts/lib/frontmatter.mjs'

test('parses frontmatter and body', () => {
  const md = `---\nname: hook-generator\ndescription: מחולל הוקים\nmetadata:\n  title_he: "מחולל הוקים הסייבורג"\n  level: beginner\n---\nגוף הסקיל כאן\n`
  const { data, body } = parseFrontmatter(md)
  assert.equal(data.name, 'hook-generator')
  assert.equal(data.metadata.title_he, 'מחולל הוקים הסייבורג')
  assert.equal(data.metadata.level, 'beginner')
  assert.equal(body.trim(), 'גוף הסקיל כאן')
})

test('returns empty data when no frontmatter', () => {
  const { data, body } = parseFrontmatter('no frontmatter here')
  assert.deepEqual(data, {})
  assert.equal(body, 'no frontmatter here')
})
