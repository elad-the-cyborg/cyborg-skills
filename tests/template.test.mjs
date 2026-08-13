import { test } from 'node:test'
import assert from 'node:assert/strict'
import YAML from 'yaml'
import { fillTemplate, toYamlStringList } from '../scripts/lib/template.mjs'

test('replaces known tokens', () => {
  assert.equal(fillTemplate('שלום {{name}}', { name: 'hook-generator' }), 'שלום hook-generator')
})
test('leaves unknown tokens intact', () => {
  assert.equal(fillTemplate('{{a}}-{{b}}', { a: 'x' }), 'x-{{b}}')
})

// --- toYamlStringList: used by new-skill.mjs to splice a scaffolded
// what_it_does_he array into the frontmatter as a real YAML block list, not
// a comma string like tags (see AUTHORING.md and templates/SKILL.md.template).

test('toYamlStringList renders one dash-quoted line per item', () => {
  const out = toYamlStringList(['פריט ראשון.', 'פריט שני.'])
  assert.equal(out, '- "פריט ראשון."\n    - "פריט שני."')
})

test('toYamlStringList output, spliced into a metadata block at the documented indent, parses back to the same array via the yaml lib', () => {
  const items = ['שואל שאלה אחת קצרה.', 'מייצר תוצר קונקרטי.', 'ממליץ על הטוב ביותר.']
  const doc = `metadata:\n  what_it_does_he:\n    ${toYamlStringList(items)}\n`
  const parsed = YAML.parse(doc)
  assert.deepEqual(parsed.metadata.what_it_does_he, items)
})

test('toYamlStringList escapes an embedded double quote so the YAML stays valid', () => {
  const items = ['פריט עם "מירכאות" בפנים.', 'פריט רגיל.']
  const doc = `metadata:\n  what_it_does_he:\n    ${toYamlStringList(items)}\n`
  const parsed = YAML.parse(doc)
  assert.deepEqual(parsed.metadata.what_it_does_he, items)
})
