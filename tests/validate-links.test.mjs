import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateLinks } from '../scripts/lib/validate-links.mjs'

const goodLink = {
  name: 'example-tool',
  title: 'Example Tool',
  url: 'https://example.com',
  summary_he: 'עוזר לעסק קטן לייצר תוכן שיווקי מהר יותר.',
  group: 'text',
  pricing_he: 'תוכנית חינמית מוגבלת, ומחיר שמתחיל בכ-20 דולר בחודש.',
  hebrew_support: 'partial',
}

test('an empty array is valid', () => {
  const r = validateLinks([])
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('a well formed link has no errors', () => {
  const r = validateLinks([goodLink])
  assert.deepEqual(r.errors, [])
})

test('non-array input is an error', () => {
  const r = validateLinks({ not: 'an array' })
  assert.ok(r.errors.some(e => e.includes('array')))
})

for (const field of ['name', 'title', 'url', 'summary_he', 'group', 'pricing_he', 'hebrew_support']) {
  test(`missing ${field} is an error`, () => {
    const link = { ...goodLink }; delete link[field]
    const r = validateLinks([link])
    assert.ok(r.errors.some(e => e.includes(field)))
  })
}

test('uppercase name is rejected', () => {
  const r = validateLinks([{ ...goodLink, name: 'Example-Tool' }])
  assert.ok(r.errors.some(e => e.includes('name')))
})

test('duplicate names across entries is an error', () => {
  const r = validateLinks([goodLink, { ...goodLink, title: 'Another Tool' }])
  assert.ok(r.errors.some(e => e.includes('duplicate')))
})

test('a relative url is an error', () => {
  const r = validateLinks([{ ...goodLink, url: '/example' }])
  assert.ok(r.errors.some(e => e.includes('url')))
})

test('a non-https url is an error', () => {
  const r = validateLinks([{ ...goodLink, url: 'http://example.com' }])
  assert.ok(r.errors.some(e => e.includes('url') && e.toLowerCase().includes('https')))
})

test('an invalid group is an error', () => {
  const r = validateLinks([{ ...goodLink, group: 'audio' }])
  assert.ok(r.errors.some(e => e.includes('group')))
})

test('an invalid hebrew_support value is an error', () => {
  const r = validateLinks([{ ...goodLink, hebrew_support: 'yes' }])
  assert.ok(r.errors.some(e => e.includes('hebrew_support')))
})

test('em dash in summary_he is an error', () => {
  const r = validateLinks([{ ...goodLink, summary_he: 'עוזר לעסק קטן — לחסוך זמן.' }])
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.toLowerCase().includes('dash')))
})

test('en dash in pricing_he is an error', () => {
  const r = validateLinks([{ ...goodLink, pricing_he: 'מחיר בין 10 – 20 דולר בחודש.' }])
  assert.ok(r.errors.some(e => e.includes('pricing_he') && e.toLowerCase().includes('dash')))
})

test('two distinct valid links produce no errors', () => {
  const second = { ...goodLink, name: 'another-tool', title: 'Another Tool', url: 'https://another.example.com' }
  const r = validateLinks([goodLink, second])
  assert.deepEqual(r.errors, [])
})
