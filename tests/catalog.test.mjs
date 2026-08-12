import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveUrls, toCatalogEntry, buildCatalog, renderCatalogMd,
  deriveGuideUrls, toGuideCatalogEntry, toLinkCatalogEntry,
} from '../scripts/lib/catalog.mjs'

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

// --- site_gate (optional, fail-open: only the literal "gated" ever gates) ---

test('toCatalogEntry defaults site_gate to "open" when the field is missing', () => {
  const e = toCatalogEntry(skill)
  assert.equal(e.site_gate, 'open')
})

test('toCatalogEntry carries through an explicit "gated" value', () => {
  const gated = { ...skill, data: { ...skill.data, metadata: { ...skill.data.metadata, site_gate: 'gated' } } }
  const e = toCatalogEntry(gated)
  assert.equal(e.site_gate, 'gated')
})

test('toCatalogEntry treats any value other than the exact string "gated" as open (typo, wrong case, non-string)', () => {
  for (const value of ['Gated', 'GATED', 'email', true, '']) {
    const withValue = { ...skill, data: { ...skill.data, metadata: { ...skill.data.metadata, site_gate: value } } }
    assert.equal(toCatalogEntry(withValue).site_gate, 'open', `site_gate ${JSON.stringify(value)} should default to open`)
  }
})

test('buildCatalog produces stable shape and sorts', () => {
  const b = skill
  const a = { ...skill, data: { ...skill.data, name: 'audience-researcher', metadata: { ...skill.data.metadata, category_slug: '01-research-strategy' } } }
  const { json } = buildCatalog([b, a], [], [], '2026-08-09T00:00:00.000Z')
  assert.equal(json.version, '1.0')
  assert.equal(json.count, 2)
  assert.equal(json.skills[0].category_slug, '01-research-strategy') // sorted first
})

test('renderCatalogMd groups each skill under a "## category" heading, with topic, title link, summary, audience, level and install command in the row', () => {
  const entry = toCatalogEntry(skill)
  const md = renderCatalogMd([entry])
  assert.ok(md.includes('## קופי ותוכן'))
  assert.ok(md.includes('| הוקים וזוויות |'))
  assert.ok(md.includes('[מחולל הוקים הסייבורג](https://github.com/elad-the-cyborg/cyborg-skills/tree/main/skills/02-copy-content/hook-generator)'))
  assert.ok(md.includes('מקבלים עשרה רעיונות לפתיחת מודעה, כל אחד בזווית שונה.'))
  assert.ok(md.includes('מתאים לבעל עסק שנתקע בפתיחה של מודעה או פוסט.'))
  assert.ok(md.includes('| beginner |'))
  assert.ok(md.includes('`npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/hook-generator ~/.claude/skills/hook-generator`'))
})

test('renderCatalogMd puts two skills from the same category under one heading, not two', () => {
  const second = { ...skill, data: { ...skill.data, name: 'ad-editor', metadata: { ...skill.data.metadata, title_he: 'עורך מודעות', topic: 'עריכה והגהה' } } }
  const md = renderCatalogMd([toCatalogEntry(skill), toCatalogEntry(second)])
  const headingCount = (md.match(/## קופי ותוכן/g) || []).length
  assert.equal(headingCount, 1)
  assert.ok(md.includes('הוקים וזוויות'))
  assert.ok(md.includes('עריכה והגהה'))
})

test('renderCatalogMd opens a new heading per category, in the order the (already category-sorted) entries arrive', () => {
  const other = { ...skill, data: { ...skill.data, name: 'campaign-brief', metadata: { ...skill.data.metadata, category: 'מחקר ואסטרטגיה', category_slug: '01-research-strategy', topic: 'בריף קמפיין', title_he: 'בריף קמפיין' } } }
  const md = renderCatalogMd([toCatalogEntry(other), toCatalogEntry(skill)])
  const researchIdx = md.indexOf('## מחקר ואסטרטגיה')
  const copyIdx = md.indexOf('## קופי ותוכן')
  assert.ok(researchIdx !== -1 && copyIdx !== -1 && researchIdx < copyIdx)
})

test('renderCatalogMd escapes pipe characters in table cells but not in the category heading', () => {
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
  assert.ok(md.includes('## קופי | תוכן')) // heading: not a table cell, no escaping needed
  assert.ok(md.includes('הוק \\| מהיר'))
  assert.ok(md.includes('תקציר \\| עם פס'))
  assert.ok(md.includes('קהל \\| עם פס'))
  assert.ok(!md.includes('הוק | מהיר'))
  assert.ok(!md.includes('תקציר | עם פס'))
  assert.ok(!md.includes('קהל | עם פס'))
})

test('renderCatalogMd opens with an intro line stating the live skill and category counts', () => {
  const md = renderCatalogMd([toCatalogEntry(skill)])
  assert.ok(md.includes('1 סקילים חיים כרגע') || md.includes('סקיל אחד חי כרגע'))
})

test('renderCatalogMd puts a blank line between one category\'s table and the next category\'s heading', () => {
  const other = { ...skill, data: { ...skill.data, name: 'campaign-brief', metadata: { ...skill.data.metadata, category: 'מחקר ואסטרטגיה', category_slug: '01-research-strategy', topic: 'בריף קמפיין', title_he: 'בריף קמפיין' } } }
  const md = renderCatalogMd([toCatalogEntry(other), toCatalogEntry(skill)])
  const lines = md.split('\n')
  const nextHeadingIdx = lines.findIndex(l => l === '## קופי ותוכן')
  assert.ok(nextHeadingIdx > 0)
  assert.equal(lines[nextHeadingIdx - 1], '')
})

test('renderCatalogMd always shows the real install command in full, regardless of the skill\'s site_gate value (the repo itself never gates)', () => {
  const gated = { ...skill, data: { ...skill.data, metadata: { ...skill.data.metadata, site_gate: 'gated' } } }
  const md = renderCatalogMd([toCatalogEntry(gated)])
  assert.ok(md.includes('`npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/hook-generator ~/.claude/skills/hook-generator`'))
})

// --- guides ---

const guide = {
  data: {
    name: 'ad-hooks-in-20-minutes',
    title_he: 'איך מייצרים סט הוקים למודעה בעשרים דקות',
    summary_he: 'מדריך קצר שמראה איך לצאת מפגישה אחת עם עשרה הוקים מוכנים למודעה.',
    category: 'קופי ותוכן',
    category_slug: '02-copy-content',
    related_skill: 'hook-generator',
    license: 'MIT',
  },
  updated_at: '2026-08-10T00:00:00.000Z',
}

test('deriveGuideUrls builds a blob link to the guide file, not a tree link to a directory', () => {
  const u = deriveGuideUrls('ad-hooks-in-20-minutes')
  assert.equal(u.github_url, 'https://github.com/elad-the-cyborg/cyborg-skills/blob/main/guides/ad-hooks-in-20-minutes/GUIDE.md')
})

test('toGuideCatalogEntry maps the flat guide fields', () => {
  const e = toGuideCatalogEntry(guide)
  assert.equal(e.name, 'ad-hooks-in-20-minutes')
  assert.equal(e.title_he, guide.data.title_he)
  assert.equal(e.summary_he, guide.data.summary_he)
  assert.equal(e.category, 'קופי ותוכן')
  assert.equal(e.category_slug, '02-copy-content')
  assert.equal(e.related_skill, 'hook-generator')
  assert.equal(e.github_url, 'https://github.com/elad-the-cyborg/cyborg-skills/blob/main/guides/ad-hooks-in-20-minutes/GUIDE.md')
  assert.equal(e.updated_at, '2026-08-10T00:00:00.000Z')
})

test('toGuideCatalogEntry carries related_skill: null through as null, not a string', () => {
  const untied = { ...guide, data: { ...guide.data, related_skill: null } }
  const e = toGuideCatalogEntry(untied)
  assert.equal(e.related_skill, null)
})

// --- links ---

const link = {
  name: 'example-tool',
  title: 'Example Tool',
  url: 'https://example.com',
  summary_he: 'עוזר לעסק קטן לייצר תוכן שיווקי מהר יותר.',
  group: 'text',
  pricing_he: 'תוכנית חינמית מוגבלת, ומחיר שמתחיל בכ-20 דולר בחודש.',
  hebrew_support: 'partial',
}

test('toLinkCatalogEntry passes through the flat link fields, trimmed', () => {
  const padded = { ...link, title: '  Example Tool  ' }
  const e = toLinkCatalogEntry(padded)
  assert.deepEqual(e, {
    name: 'example-tool',
    title: 'Example Tool',
    url: 'https://example.com',
    summary_he: link.summary_he,
    group: 'text',
    pricing_he: link.pricing_he,
    hebrew_support: 'partial',
  })
})

// --- buildCatalog with guides + links ---

test('buildCatalog adds top-level guides and links arrays without disturbing skills', () => {
  const { json } = buildCatalog([skill], [guide], [link], '2026-08-10T00:00:00.000Z')
  assert.equal(json.skills.length, 1)
  assert.equal(json.guides.length, 1)
  assert.equal(json.links.length, 1)
  assert.equal(json.guides[0].name, 'ad-hooks-in-20-minutes')
  assert.equal(json.links[0].name, 'example-tool')
})

test('buildCatalog defaults to empty guides and links arrays when none are given', () => {
  const { json } = buildCatalog([skill], [], [], '2026-08-10T00:00:00.000Z')
  assert.deepEqual(json.guides, [])
  assert.deepEqual(json.links, [])
})

test('renderCatalogMd includes a guides section with title link, summary and related skill', () => {
  const md = renderCatalogMd([toCatalogEntry(skill)], [toGuideCatalogEntry(guide)], [])
  assert.ok(md.includes('## מדריכים'))
  assert.ok(md.includes(`[${guide.data.title_he}](${deriveGuideUrls(guide.data.name).github_url})`))
  assert.ok(md.includes(guide.data.summary_he))
  assert.ok(md.includes('hook-generator'))
})

test('renderCatalogMd includes a links section with tool name linked to its url', () => {
  const md = renderCatalogMd([toCatalogEntry(skill)], [], [toLinkCatalogEntry(link)])
  assert.ok(md.includes('## כלים מומלצים'))
  assert.ok(md.includes('[Example Tool](https://example.com)'))
  assert.ok(md.includes(link.summary_he))
})

test('renderCatalogMd shows a friendly placeholder when the links list is empty, not a broken empty table', () => {
  const md = renderCatalogMd([toCatalogEntry(skill)], [], [])
  assert.ok(md.includes('## כלים מומלצים'))
  assert.ok(!md.includes('| Example Tool |'))
})
