import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fillTemplate } from '../scripts/lib/template.mjs'

test('replaces known tokens', () => {
  assert.equal(fillTemplate('שלום {{name}}', { name: 'hook-generator' }), 'שלום hook-generator')
})
test('leaves unknown tokens intact', () => {
  assert.equal(fillTemplate('{{a}}-{{b}}', { a: 'x' }), 'x-{{b}}')
})
