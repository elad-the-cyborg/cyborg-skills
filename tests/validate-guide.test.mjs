import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateGuide } from '../scripts/lib/validate-guide.mjs'

const goodData = {
  name: 'ad-hooks-in-20-minutes',
  title_he: 'איך מייצרים סט הוקים למודעה בעשרים דקות',
  summary_he: 'מדריך קצר שמראה איך לצאת מפגישה אחת עם עשרה הוקים מוכנים למודעה, ולא עם דף ריק.',
  category: 'קופי ותוכן',
  category_slug: '02-copy-content',
  related_skill: 'hook-generator',
  license: 'MIT',
}
const goodBody = `# איך מייצרים סט הוקים למודעה בעשרים דקות\n\nתוכן המדריך כאן. בהמשך הדרך מתקינים את hook-generator כדי להריץ את זה שוב על כל מוצר.\n\n## שלב ראשון\n\nגוף.\n\n## שלב שני\n\nגוף.\n\n## שלב שלישי\n\nגוף.\n`
const skillNames = ['hook-generator']

test('valid guide has no errors', () => {
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body: goodBody, skillNames })
  assert.deepEqual(r.errors, [])
})

test('name must match directory', () => {
  const r = validateGuide({ dirName: 'wrong-dir', data: goodData, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('name')))
})

test('uppercase name is rejected', () => {
  const data = { ...goodData, name: 'Ad-Hooks' }
  const r = validateGuide({ dirName: 'Ad-Hooks', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('name')))
})

test('reserved word anthropic is rejected', () => {
  const data = { ...goodData, name: 'anthropic-guide' }
  const r = validateGuide({ dirName: 'anthropic-guide', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('reserved')))
})

// A guide explains a tool, so naming it after that tool is descriptive, not a
// claim to be part of it. Skills keep the stricter rule; see validate-skill.mjs.
test('a guide may be named after the tool it explains', () => {
  const data = { ...goodData, name: 'safe-use-of-claude-code' }
  const r = validateGuide({ dirName: 'safe-use-of-claude-code', data, body: goodBody, skillNames })
  assert.deepEqual(r.errors, [])
})

test('non-MIT license is rejected', () => {
  const data = { ...goodData, license: 'Apache-2.0' }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('license')))
})

test('missing title_he is an error', () => {
  const data = { ...goodData }; delete data.title_he
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('title_he')))
})

test('missing category is an error', () => {
  const data = { ...goodData }; delete data.category
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('category') && !e.includes('category_slug')))
})

test('missing category_slug is an error', () => {
  const data = { ...goodData }; delete data.category_slug
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('category_slug')))
})

test('missing summary_he is an error', () => {
  const data = { ...goodData }; delete data.summary_he
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('summary_he')))
})

test('summary_he exceeding max length is an error', () => {
  const data = { ...goodData, summary_he: 'א'.repeat(321) }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('summary_he')))
})

test('summary_he repeating the guide title is an error', () => {
  const data = { ...goodData, summary_he: `${goodData.title_he} מדריך קצר וטוב.` }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.includes('title')))
})

test('em dash in summary_he is an error', () => {
  const data = { ...goodData, summary_he: 'מדריך קצר — עוזר לכתוב הוקים מהר.' }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.toLowerCase().includes('dash')))
})

test('en dash in title_he is an error', () => {
  const data = { ...goodData, title_he: 'הוקים למודעה – במהירות' }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('title_he') && e.toLowerCase().includes('dash')))
})

test('em dash in category is an error', () => {
  const data = { ...goodData, category: 'קופי — ותוכן' }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('category') && e.toLowerCase().includes('dash')))
})

test('missing related_skill key is an error', () => {
  const data = { ...goodData }; delete data.related_skill
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('related_skill')))
})

test('related_skill explicitly null is valid', () => {
  const data = { ...goodData, related_skill: null }
  const body = `# איך מייצרים סט הוקים למודעה בעשרים דקות\n\nתוכן המדריך כאן, בלי סקיל ספציפי.\n\n## שלב ראשון\n\nגוף.\n\n## שלב שני\n\nגוף.\n\n## שלב שלישי\n\nגוף.\n`
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body, skillNames })
  assert.deepEqual(r.errors, [])
})

test('related_skill referencing an unknown skill is an error', () => {
  const data = { ...goodData, related_skill: 'no-such-skill' }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('related_skill') && e.includes('no-such-skill')))
})

test('related_skill set but never mentioned in the body is an error', () => {
  const body = `# איך מייצרים סט הוקים למודעה בעשרים דקות\n\nתוכן בלי אזכור של שם הסקיל בכלל.\n`
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body, skillNames })
  assert.ok(r.errors.some(e => e.includes('related_skill') && e.includes('hook-generator')))
})

test('body without an H1 heading is an error', () => {
  const body = `תוכן בלי כותרת H1 בכלל, כולל hook-generator בפנים.\n`
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body, skillNames })
  assert.ok(r.errors.some(e => e.includes('heading') || e.includes('#')))
})

test('empty body is an error', () => {
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body: '   ', skillNames })
  assert.ok(r.errors.some(e => e.includes('body')))
})

test('em dash in body prose is an error', () => {
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body: goodBody + '\nזה משפט עם מקף מפריד — בתוך הטקסט.', skillNames })
  assert.ok(r.errors.some(e => e.toLowerCase().includes('dash') || e.includes('—')))
})

test('em dash inside a fenced code block in the body is not an error', () => {
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body: goodBody + '\n```\nדוגמה עם — בפנים הבלוק\n```\n', skillNames })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('a literal /Users/ path in the body is an error', () => {
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body: goodBody + '\nשמרנו קובץ ב-/Users/elad/Desktop/הוקים.docx.', skillNames })
  assert.ok(r.errors.some(e => e.includes('/Users/')))
})

test('forbidden marker in body is a warning not an error', () => {
  const r = validateGuide({
    dirName: 'ad-hooks-in-20-minutes', data: goodData, body: goodBody + '\nמבוסס על שיטת אקמה', skillNames,
    forbiddenMarkers: ['שיטת אקמה'],
  })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('forbidden')))
})

test('body needs at least three sections, they become the steps on the site', () => {
  const thin = `# כותרת\n\nפתיח. בהמשך מתקינים את hook-generator.\n\n## שלב יחיד\n\nגוף.\n`
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: goodData, body: thin, skillNames })
  assert.ok(r.errors.some(e => e.includes('section')), JSON.stringify(r.errors))
})

test('steps_label is optional but must be a short word when present', () => {
  const withLabel = { ...goodData, steps_label: 'כלל' }
  assert.deepEqual(validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: withLabel, body: goodBody, skillNames }).errors, [])

  const sentence = { ...goodData, steps_label: 'השלב הבא במדריך הזה' }
  const r = validateGuide({ dirName: 'ad-hooks-in-20-minutes', data: sentence, body: goodBody, skillNames })
  assert.ok(r.errors.some(e => e.includes('steps_label')), JSON.stringify(r.errors))
})
