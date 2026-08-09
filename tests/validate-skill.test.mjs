import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSkill } from '../scripts/lib/validate-skill.mjs'

const goodData = {
  name: 'hook-generator',
  description: 'מחולל הוקים הסייבורג — מייצר הוקים למודעות.',
  license: 'MIT',
  metadata: {
    title_he: 'מחולל הוקים הסייבורג', category: 'קופי ותוכן',
    category_slug: '02-copy-content', topic: 'הוקים וזוויות',
    level: 'beginner', visibility: 'public',
    author: 'The Cyborg', site: 'https://thecyborg.co.il', version: '1.0.0',
  },
}
const goodBody = `\n⚡ The Cyborg · מחולל הוקים הסייבורג\nקרא קודם את CLAUDE.md של העסק.\n`

test('valid skill has no errors', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
})

test('name must match directory', () => {
  const r = validateSkill({ dirName: 'wrong-dir', data: goodData, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('name')))
})

test('uppercase name is rejected', () => {
  const data = { ...goodData, name: 'Hook-Generator' }
  const r = validateSkill({ dirName: 'Hook-Generator', data, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('name')))
})

test('reserved word claude is rejected', () => {
  const data = { ...goodData, name: 'claude-helper' }
  const r = validateSkill({ dirName: 'claude-helper', data, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('reserved')))
})

test('non-MIT license is rejected', () => {
  const data = { ...goodData, license: 'Apache-2.0' }
  const r = validateSkill({ dirName: 'hook-generator', data, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('license')))
})

test('missing metadata key is an error', () => {
  const md = { ...goodData.metadata }; delete md.title_he
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('title_he')))
})

test('bad level enum is an error', () => {
  const data = { ...goodData, metadata: { ...goodData.metadata, level: 'expert' } }
  const r = validateSkill({ dirName: 'hook-generator', data, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('level')))
})

test('missing brand banner is an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: 'קרא CLAUDE.md', hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('banner')))
})

test('missing CLAUDE.md read step is an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: '⚡ The Cyborg · x', hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('CLAUDE.md')))
})

test('missing INSTALL.md is an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: false })
  assert.ok(r.errors.some(e => e.includes('INSTALL')))
})

test('forbidden marker is a warning not an error', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nמבוסס על שיטת אקמה', hasInstall: true,
    forbiddenMarkers: ['שיטת אקמה'],
  })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('forbidden')))
})

test('with no forbidden markers configured, the same body produces no warnings', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nמבוסס על שיטת אקמה', hasInstall: true,
  })
  assert.deepEqual(r.warnings, [])
})

test('forbidden marker matching is case-insensitive and whitespace-tolerant', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nBuilt on the Acme  Method.', hasInstall: true,
    forbiddenMarkers: ['acme method'],
  })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('forbidden')))
})

test('empty and whitespace-only markers are ignored and do not cause false warnings', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true,
    forbiddenMarkers: ['', '   '],
  })
  assert.deepEqual(r.warnings, [])
})

test('an empty marker earlier in the array does not suppress a real marker later in it', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nמבוסס על שיטת אקמה', hasInstall: true,
    forbiddenMarkers: ['', '   ', 'שיטת אקמה'],
  })
  assert.ok(r.warnings.some(w => w.includes('forbidden')))
})

test('a Latin marker does not match a longer word that merely contains it', () => {
  const matches = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nBuilt with the Blue Harbor toolkit.', hasInstall: true,
    forbiddenMarkers: ['blue harbor'],
  })
  assert.ok(matches.warnings.some(w => w.includes('forbidden')))

  const noMatch = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nTaking things to the Blue Harbors of excellence.', hasInstall: true,
    forbiddenMarkers: ['blue harbor'],
  })
  assert.deepEqual(noMatch.warnings, [])
})

test('a Hebrew marker matches standalone but not glued inside a longer word', () => {
  const standalone = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nהעסק בנוי על שיטת אקמה בעברית.', hasInstall: true,
    forbiddenMarkers: ['אקמה'],
  })
  assert.ok(standalone.warnings.some(w => w.includes('forbidden')))

  const gluedAfter = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nהעסק בנוי על שיטת אקמהיסטית בעברית.', hasInstall: true,
    forbiddenMarkers: ['אקמה'],
  })
  assert.deepEqual(gluedAfter.warnings, [])

  const gluedBefore = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nהעסק בנוי על פרואקמה בעברית.', hasInstall: true,
    forbiddenMarkers: ['אקמה'],
  })
  assert.deepEqual(gluedBefore.warnings, [])
})

test('category_slug matching the category directory has no error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true, catDirName: '02-copy-content' })
  assert.deepEqual(r.errors, [])
})

test('category_slug disagreeing with the category directory is an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true, catDirName: '07-automation-qa' })
  assert.ok(r.errors.some(e => e.includes('category_slug')))
})

test('em dash in body prose is an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nזה משפט עם מקף מפריד — בתוך הטקסט.', hasInstall: true })
  assert.ok(r.errors.some(e => e.toLowerCase().includes('dash') || e.includes('—')))
})

test('em dash inside an inline code span is not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nהתו `—` הוא מקף מפריד.', hasInstall: true })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('em dash inside a fenced code block is not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\n```\nדוגמה עם — בפנים הבלוק\n```\n', hasInstall: true })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('en dash in body prose is an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nזה משפט עם מקף מפריד – בתוך הטקסט.', hasInstall: true })
  assert.ok(r.errors.some(e => e.toLowerCase().includes('dash') || e.includes('–')))
})

test('en dash inside an inline code span is not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nהתו `–` הוא מקף אנגלי קצר.', hasInstall: true })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('en dash inside a fenced code block is not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\n```\nדוגמה עם – בפנים הבלוק\n```\n', hasInstall: true })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('rm -rf in body is a safety warning not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nלעולם אל תריץ `rm -rf` על תיקיית העבודה.', hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.toLowerCase().includes('rm -rf')))
})

test('git push in body is a safety warning not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nבסיום מריצים git push origin main.', hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.toLowerCase().includes('git push')))
})

test('curl to an external host in body is a safety warning not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nהרץ curl https://example.com/api כדי לשלוף את הנתונים.', hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.toLowerCase().includes('curl') || w.toLowerCase().includes('network')))
})

test('instruction to send mail in body is a safety warning not an error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nבסיום שלח מייל ללקוח עם הסיכום.', hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.toLowerCase().includes('mail')))
})
