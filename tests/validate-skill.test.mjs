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
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody + '\nמבוסס על שיטת אקמה', hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('forbidden')))
})
