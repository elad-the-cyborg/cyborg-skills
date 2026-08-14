import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderInline, parseBlocks, parseGuideBody, countWords, readMinutes } from '../scripts/lib/guide-body.mjs'

test('renderInline escapes HTML in plain text', () => {
  assert.equal(renderInline('a < b & c > d'), 'a &lt; b &amp; c &gt; d')
})

test('renderInline renders code, bold and http links', () => {
  assert.equal(renderInline('`npm i`'), '<code>npm i</code>')
  assert.equal(renderInline('**חשוב**'), '<strong>חשוב</strong>')
  assert.equal(
    renderInline('[קישור](https://thecyborg.co.il/a?b=1&c=2)'),
    '<a href="https://thecyborg.co.il/a?b=1&amp;c=2" rel="noopener" target="_blank">קישור</a>',
  )
})

test('renderInline keeps punctuation glued to a code span', () => {
  // הדפוס הזה מופיע במדריכים בפועל ("סקיל בשם `hook-generator`, שנבנה..."), והוא
  // בדיוק מה שנשבר כשמחליפים מקטע קוד בסימן פנימי עם רווחים סביבו.
  assert.equal(renderInline('בשם `hook-generator`, שנבנה'), 'בשם <code>hook-generator</code>, שנבנה')
})

test('renderInline does not treat markup inside a code span as markup', () => {
  assert.equal(renderInline('`**לא מודגש**`'), '<code>**לא מודגש**</code>')
})

test('renderInline leaves a non-http link as plain text', () => {
  const out = renderInline('[לחצו](javascript:alert(1))')
  assert.ok(!out.includes('<a '), out)
})

test('parseBlocks joins wrapped lines into one paragraph', () => {
  const blocks = parseBlocks('שורה ראשונה\nשורה שנייה\n\nפסקה שנייה')
  assert.deepEqual(blocks, [
    { type: 'p', html: 'שורה ראשונה שורה שנייה' },
    { type: 'p', html: 'פסקה שנייה' },
  ])
})

test('parseBlocks reads bullet lists, numbered lists and sub-headings', () => {
  const blocks = parseBlocks('### כותרת משנה\n\n- ראשון\n- שני\n\n1. אחד\n2. שתיים')
  assert.deepEqual(blocks, [
    { type: 'h3', html: 'כותרת משנה' },
    { type: 'ul', items: ['ראשון', 'שני'] },
    { type: 'ol', items: ['אחד', 'שתיים'] },
  ])
})

test('parseBlocks keeps a fenced code block verbatim', () => {
  const blocks = parseBlocks('לפני\n\n```\nnpx degit foo bar\n```\n\nאחרי')
  assert.deepEqual(blocks[1], { type: 'code', text: 'npx degit foo bar' })
})

test('parseGuideBody drops the H1 and splits the rest at H2', () => {
  const { intro, steps } = parseGuideBody('# הכותרת\n\nפתיח.\n\n## שלב ראשון\n\nגוף א.\n\n## שלב שני\n\nגוף ב.\n')
  assert.deepEqual(intro, [{ type: 'p', html: 'פתיח.' }])
  assert.equal(steps.length, 2)
  assert.equal(steps[0].title, 'שלב ראשון')
  assert.deepEqual(steps[0].blocks, [{ type: 'p', html: 'גוף א.' }])
  assert.equal(steps[1].title, 'שלב שני')
})

test('parseGuideBody does not split on a ## line inside a code block', () => {
  const { steps } = parseGuideBody('# כותרת\n\nפתיח.\n\n## שלב\n\n```\n## זה קוד\n```\n')
  assert.equal(steps.length, 1)
  assert.equal(steps[0].blocks[0].text, '## זה קוד')
})

test('parseGuideBody does not split on H3', () => {
  const { steps } = parseGuideBody('# כותרת\n\nפתיח.\n\n## שלב\n\n### תת סעיף\n\nגוף.\n')
  assert.equal(steps.length, 1)
  assert.equal(steps[0].blocks[0].type, 'h3')
})

test('read time has a two minute floor and rounds by words', () => {
  assert.equal(readMinutes(10), 2)
  assert.equal(readMinutes(900), 5)
})

test('countWords ignores fenced code', () => {
  assert.equal(countWords('אחת שתיים\n\n```\nnpx degit a b c d e f g\n```\n'), 2)
})
