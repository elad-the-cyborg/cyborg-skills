import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveUrls, toCatalogEntry, buildCatalog } from '../scripts/lib/catalog.mjs'

const skill = {
  data: {
    name: 'hook-generator',
    description: 'מחולל הוקים הסייבורג — מייצר הוקים למודעות.',
    metadata: {
      title_he: 'מחולל הוקים הסייבורג', category: 'קופי ותוכן',
      category_slug: '02-copy-content', topic: 'הוקים וזוויות',
      level: 'beginner', visibility: 'public', tags: 'קופי, מודעות, הוקים',
      author: 'The Cyborg', site: 'https://thecyborg.co.il', version: '1.0.0',
    },
  },
  updated_at: '2026-08-09T00:00:00.000Z',
}

test('deriveUrls builds degit + github links', () => {
  const u = deriveUrls('02-copy-content', 'hook-generator')
  assert.equal(u.install_command, 'npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/hook-generator ~/.claude/skills/hook-generator')
  assert.ok(u.github_url.endsWith('/skills/02-copy-content/hook-generator'))
  assert.ok(u.install_guide_url.endsWith('/INSTALL.md'))
})

test('toCatalogEntry maps fields and splits tags', () => {
  const e = toCatalogEntry(skill)
  assert.equal(e.name, 'hook-generator')
  assert.equal(e.title_he, 'מחולל הוקים הסייבורג')
  assert.equal(e.visibility, 'public')
  assert.deepEqual(e.tags, ['קופי', 'מודעות', 'הוקים'])
  assert.equal(e.updated_at, '2026-08-09T00:00:00.000Z')
})

test('buildCatalog produces stable shape and sorts', () => {
  const b = skill
  const a = { ...skill, data: { ...skill.data, name: 'audience-researcher', metadata: { ...skill.data.metadata, category_slug: '01-research-strategy' } } }
  const { json } = buildCatalog([b, a], '2026-08-09T00:00:00.000Z')
  assert.equal(json.version, '1.0')
  assert.equal(json.count, 2)
  assert.equal(json.skills[0].category_slug, '01-research-strategy') // sorted first
})
