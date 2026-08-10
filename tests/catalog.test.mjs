import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveUrls, toCatalogEntry, buildCatalog, renderCatalogMd } from '../scripts/lib/catalog.mjs'

const skill = {
  data: {
    name: 'hook-generator',
    description: 'מחולל הוקים הסייבורג — מייצר הוקים למודעות.',
    metadata: {
      title_he: 'מחולל הוקים הסייבורג', category: 'קופי ותוכן',
      category_slug: '02-copy-content', topic: 'הוקים וזוויות',
      level: 'beginner', visibility: 'public', tags: 'קופי, מודעות, הוקים',
      author: 'The Cyborg', site: 'https://thecyborg.co.il', version: '1.0.0',
      summary_he: 'מקבלים עשרה רעיונות לפתיחת מודעה, כל אחד בזווית שונה.',
      audience_he: 'מתאים לבעל עסק שנתקע בפתיחה של מודעה או פוסט.',
      safety: { writes_files: false, sends_external: false, touches_live_campaigns: false },
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

test('toCatalogEntry maps summary_he, audience_he and safety', () => {
  const e = toCatalogEntry(skill)
  assert.equal(e.summary_he, 'מקבלים עשרה רעיונות לפתיחת מודעה, כל אחד בזווית שונה.')
  assert.equal(e.audience_he, 'מתאים לבעל עסק שנתקע בפתיחה של מודעה או פוסט.')
  assert.deepEqual(e.safety, { writes_files: false, sends_external: false, touches_live_campaigns: false })
})

test('buildCatalog produces stable shape and sorts', () => {
  const b = skill
  const a = { ...skill, data: { ...skill.data, name: 'audience-researcher', metadata: { ...skill.data.metadata, category_slug: '01-research-strategy' } } }
  const { json } = buildCatalog([b, a], '2026-08-09T00:00:00.000Z')
  assert.equal(json.version, '1.0')
  assert.equal(json.count, 2)
  assert.equal(json.skills[0].category_slug, '01-research-strategy') // sorted first
})

test('renderCatalogMd renders a normal row with category, topic, title link, summary, audience, level and install command', () => {
  const entry = toCatalogEntry(skill)
  const md = renderCatalogMd([entry])
  assert.ok(md.includes('| קופי ותוכן | הוקים וזוויות |'))
  assert.ok(md.includes('[מחולל הוקים הסייבורג](https://github.com/elad-the-cyborg/cyborg-skills/tree/main/skills/02-copy-content/hook-generator)'))
  assert.ok(md.includes('מקבלים עשרה רעיונות לפתיחת מודעה, כל אחד בזווית שונה.'))
  assert.ok(md.includes('מתאים לבעל עסק שנתקע בפתיחה של מודעה או פוסט.'))
  assert.ok(md.includes('| beginner |'))
  assert.ok(md.includes('`npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/hook-generator ~/.claude/skills/hook-generator`'))
})

test('renderCatalogMd escapes pipe characters in cell values so they cannot break the table', () => {
  const withPipe = {
    ...skill,
    data: {
      ...skill.data,
      metadata: {
        ...skill.data.metadata,
        category: 'קופי | תוכן', title_he: 'הוק | מהיר',
        summary_he: 'תקציר | עם פס', audience_he: 'קהל | עם פס',
      },
    },
  }
  const entry = toCatalogEntry(withPipe)
  const md = renderCatalogMd([entry])
  assert.ok(md.includes('קופי \\| תוכן'))
  assert.ok(md.includes('הוק \\| מהיר'))
  assert.ok(md.includes('תקציר \\| עם פס'))
  assert.ok(md.includes('קהל \\| עם פס'))
  assert.ok(!md.includes('קופי | תוכן'))
  assert.ok(!md.includes('הוק | מהיר'))
  assert.ok(!md.includes('תקציר | עם פס'))
  assert.ok(!md.includes('קהל | עם פס'))
})
