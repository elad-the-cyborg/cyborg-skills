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
    summary_he: 'מקבלים עשרה רעיונות לפתיחת מודעה, כל אחד בזווית שונה.',
    audience_he: 'מתאים לבעל עסק שנתקע בפתיחה של מודעה או פוסט.',
    what_it_does_he: [
      'שואל שלוש שאלות קצרות על המוצר, הקהל והכאב שהוא פותר.',
      'מייצר עשרה הוקים לפתיחת מודעה או פוסט, כל אחד מזווית שונה.',
      'ממליץ על שלושת ההוקים החזקים ביותר לקהל הספציפי.',
    ],
    how_it_helps_he: 'חוסך את השלב הכי תקוע בכתיבת קופי, ונותן כמה זוויות אמיתיות לבדוק מול קהל במקום לנחש לבד.',
    safety: { writes_files: false, sends_external: false, touches_live_campaigns: false },
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

test('a single-letter Hebrew proclitic glued directly onto a marker still triggers the warning', () => {
  // ו/ה/ב/ל/מ/ש/כ are the standard one-letter prefixes ("and", "the", "in",
  // "to", "from", "that", "like") that Hebrew attaches straight onto a noun
  // with no space, e.g. "באקמה" ("in Acme"). This is one of the most common
  // constructions in Hebrew prose, so the guard must not miss it.
  const proclitics = ['ו', 'ה', 'ב', 'ל', 'מ', 'ש', 'כ']
  for (const p of proclitics) {
    const r = validateSkill({
      dirName: 'hook-generator', data: goodData, body: goodBody + `\nבדקנו את ${p}אקמה בקפידה.`, hasInstall: true,
      forbiddenMarkers: ['אקמה'],
    })
    assert.ok(r.warnings.some(w => w.includes('forbidden')), `proclitic "${p}" should still trigger a warning`)
  }
})

test('a marker preceded by punctuation such as a hyphen or a maqaf still triggers the warning', () => {
  // Any non letter/digit/underscore character immediately before the marker
  // is already a valid word start on its own, whether or not a Hebrew
  // proclitic is involved: this pins that general boundary behavior, not a
  // proclitic-specific mechanism.
  const hyphen = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nזה נבנה עם ב-Blue Harbor בשבילכם.', hasInstall: true,
    forbiddenMarkers: ['blue harbor'],
  })
  assert.ok(hyphen.warnings.some(w => w.includes('forbidden')))

  const maqaf = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nזה נבנה עם ב־Blue Harbor בשבילכם.', hasInstall: true,
    forbiddenMarkers: ['blue harbor'],
  })
  assert.ok(maqaf.warnings.some(w => w.includes('forbidden')))
})

test('a marker can match inside an unrelated word starting with a proclitic letter (known, accepted limitation)', () => {
  // Nothing short of a full lexicon can tell a genuine glued proclitic apart
  // from a real word that simply happens to start with the same letter.
  // Invented example: the marker "ורד" also matches inside the ordinary
  // word "מורד" ("slope"), because word-initial מ is indistinguishable from
  // the proclitic מ ("from"). This is accepted, not a bug to chase: the
  // check is warnings-only and every warning is read by a human before it
  // means anything. See the doc comment above markerToRegExp and
  // AUTHORING.md section 3.
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nירדנו במורד ההר, מורד תלול מאוד.', hasInstall: true,
    forbiddenMarkers: ['ורד'],
  })
  assert.ok(r.warnings.some(w => w.includes('forbidden')))
})

test('a multi-letter Hebrew stem glued in front of a marker still does not trigger a warning', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nהעסק בנוי על פרואקמה בעברית.', hasInstall: true,
    forbiddenMarkers: ['אקמה'],
  })
  assert.deepEqual(r.warnings, [])
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

// --- summary_he / audience_he / safety (customer-facing metadata) ---

test('missing metadata.summary_he is an error', () => {
  const md = { ...goodData.metadata }; delete md.summary_he
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('summary_he')))
})

test('missing metadata.audience_he is an error', () => {
  const md = { ...goodData.metadata }; delete md.audience_he
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('audience_he')))
})

test('summary_he that repeats the skill title is an error', () => {
  const md = { ...goodData.metadata, summary_he: 'מחולל הוקים הסייבורג עוזר לכם לכתוב מודעות.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.includes('title')))
})

test('summary_he containing a trigger phrase is an error', () => {
  const md = { ...goodData.metadata, summary_he: 'הפעל כשרוצים לכתוב מודעה חדשה בעברית.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.toLowerCase().includes('trigger')))
})

test('summary_he mentioning CLAUDE.md is an error', () => {
  const md = { ...goodData.metadata, summary_he: 'קורא קודם CLAUDE.md ואז מייצר עשרה רעיונות.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.includes('CLAUDE.md')))
})

test('em dash in summary_he is an error even though it is allowed in description', () => {
  const md = { ...goodData.metadata, summary_he: 'מקבלים רעיונות לפתיחה — כל אחד בזווית שונה.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('summary_he') && e.toLowerCase().includes('dash')))
})

test('en dash in audience_he is an error', () => {
  const md = { ...goodData.metadata, audience_he: 'מתאים לעסק קטן – בינוני שכותב מודעות.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('audience_he') && e.toLowerCase().includes('dash')))
})

test('missing metadata.safety is an error', () => {
  const md = { ...goodData.metadata }; delete md.safety
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('safety')))
})

test('metadata.safety as a non-object is an error', () => {
  const md = { ...goodData.metadata, safety: 'none of it' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('safety')))
})

test('metadata.safety missing writes_files is an error', () => {
  const md = { ...goodData.metadata, safety: { sends_external: false, touches_live_campaigns: false } }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('safety.writes_files')))
})

test('metadata.safety with a non-boolean value is an error', () => {
  const md = { ...goodData.metadata, safety: { writes_files: 'yes', sends_external: false, touches_live_campaigns: false } }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('safety.writes_files')))
})

test('metadata.safety with an unknown key is an error', () => {
  const md = { ...goodData.metadata, safety: { writes_files: false, sends_external: false, touches_live_campaigns: false, deletes_files: false } }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('safety') && e.includes('deletes_files')))
})

test('metadata.safety with all three booleans present is valid', () => {
  const md = { ...goodData.metadata, safety: { writes_files: true, sends_external: false, touches_live_campaigns: false } }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
})

// --- what_it_does_he / how_it_helps_he (customer-facing detail fields) ---

test('missing metadata.what_it_does_he is an error', () => {
  const md = { ...goodData.metadata }; delete md.what_it_does_he
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he')))
})

test('what_it_does_he as a string instead of an array is an error', () => {
  const md = { ...goodData.metadata, what_it_does_he: 'מייצר עשרה הוקים.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he') && e.toLowerCase().includes('array')))
})

test('what_it_does_he with only 2 items is an error (needs 3 to 5)', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['פריט ראשון.', 'פריט שני.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he')))
})

test('what_it_does_he with 6 items is an error (needs 3 to 5)', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['אחד.', 'שתיים.', 'שלוש.', 'ארבע.', 'חמש.', 'שש.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he')))
})

test('what_it_does_he with 3 items is valid', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['אחד עומד בפני עצמו.', 'שתיים עומד בפני עצמו.', 'שלוש עומד בפני עצמו.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
})

test('what_it_does_he with 5 items is valid', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['אחד.', 'שתיים.', 'שלוש.', 'ארבע.', 'חמש.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
})

test('an empty string item inside what_it_does_he is an error', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['פריט ראשון תקין.', '  ', 'פריט שלישי תקין.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he')))
})

test('a what_it_does_he item exceeding the max length is an error', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['תקין.', 'תקין גם כן.', 'א'.repeat(300)] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he')))
})

test('em dash inside a what_it_does_he item is an error', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['תקין ראשון.', 'תקין שני.', 'פריט עם מקף מפריד — בפנים.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he') && e.toLowerCase().includes('dash')))
})

test('a what_it_does_he item containing a trigger phrase is an error', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['תקין ראשון.', 'תקין שני.', 'הפעל כשרוצים לכתוב מודעה.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he') && e.toLowerCase().includes('trigger')))
})

test('a what_it_does_he item mentioning CLAUDE.md is an error', () => {
  const md = { ...goodData.metadata, what_it_does_he: ['תקין ראשון.', 'תקין שני.', 'קורא קודם CLAUDE.md ומייצר רעיונות.'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('what_it_does_he') && e.includes('CLAUDE.md')))
})

test('missing metadata.how_it_helps_he is an error', () => {
  const md = { ...goodData.metadata }; delete md.how_it_helps_he
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he')))
})

test('how_it_helps_he as an array instead of a string is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: ['לא', 'מחרוזת'] }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he')))
})

test('how_it_helps_he that repeats the skill title is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: 'מחולל הוקים הסייבורג עוזר לכם לכתוב מודעות טובות יותר.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he') && e.includes('title')))
})

test('how_it_helps_he containing a trigger phrase is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: 'הפעל כשרוצים לכתוב מודעה חדשה בעברית ותרוויחו זמן.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he') && e.toLowerCase().includes('trigger')))
})

test('how_it_helps_he mentioning CLAUDE.md is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: 'קורא קודם CLAUDE.md ואז חוסך לכם זמן על כתיבה.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he') && e.includes('CLAUDE.md')))
})

test('em dash in how_it_helps_he is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: 'חוסך זמן על כתיבה — ונותן כמה כיוונים לבחור ביניהם.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he') && e.toLowerCase().includes('dash')))
})

test('en dash in how_it_helps_he is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: 'חוסך זמן על כתיבה – ונותן כמה כיוונים לבחור ביניהם.' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he') && e.toLowerCase().includes('dash')))
})

test('how_it_helps_he exceeding the max length is an error', () => {
  const md = { ...goodData.metadata, how_it_helps_he: 'א'.repeat(700) }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.ok(r.errors.some(e => e.includes('how_it_helps_he')))
})

test('valid what_it_does_he and how_it_helps_he together produce no errors', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
})

// --- site_gate (optional, fail-open: missing or malformed must never gate) ---

test('missing metadata.site_gate is neither an error nor a warning', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('metadata.site_gate "open" is valid with no errors or warnings', () => {
  const md = { ...goodData.metadata, site_gate: 'open' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('metadata.site_gate "gated" is valid with no errors or warnings', () => {
  const md = { ...goodData.metadata, site_gate: 'gated' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('metadata.site_gate with an unrecognized value is a warning, never an error', () => {
  const md = { ...goodData.metadata, site_gate: 'secret' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('site_gate')))
})

test('metadata.site_gate with the wrong casing is a warning, never an error (fail toward open, not a silent pass)', () => {
  const md = { ...goodData.metadata, site_gate: 'Open' }
  const r = validateSkill({ dirName: 'hook-generator', data: { ...goodData, metadata: md }, body: goodBody, hasInstall: true })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('site_gate')))
})

// --- INSTALL.md body: same content checks as SKILL.md, file named in the message ---

const goodInstallBody = '# התקנה\n\nהעתק את התיקייה ל-~/.claude/skills/.\n'

test('clean INSTALL.md body alongside clean SKILL.md body produces no dash or marker errors/warnings', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true, installBody: goodInstallBody,
    forbiddenMarkers: ['שיטת אקמה'],
  })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.warnings, [])
})

test('forbidden marker only in INSTALL.md is a warning naming INSTALL.md', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true,
    installBody: goodInstallBody + '\nמבוסס על שיטת אקמה',
    forbiddenMarkers: ['שיטת אקמה'],
  })
  assert.deepEqual(r.errors, [])
  assert.ok(r.warnings.some(w => w.includes('forbidden') && w.includes('INSTALL.md')))
})

test('forbidden marker present in both SKILL.md and INSTALL.md produces a separate warning per file', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nמבוסס על שיטת אקמה', hasInstall: true,
    installBody: goodInstallBody + '\nמבוסס על שיטת אקמה',
    forbiddenMarkers: ['שיטת אקמה'],
  })
  assert.ok(r.warnings.some(w => w.includes('forbidden') && w.includes('SKILL.md')))
  assert.ok(r.warnings.some(w => w.includes('forbidden') && w.includes('INSTALL.md')))
  assert.equal(r.warnings.filter(w => w.includes('forbidden')).length, 2)
})

test('em dash only in INSTALL.md body is an error naming INSTALL.md', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true,
    installBody: goodInstallBody + '\nזה משפט עם מקף מפריד — בתוך הטקסט.',
  })
  assert.ok(r.errors.some(e => e.toLowerCase().includes('dash') && e.includes('INSTALL.md')))
})

test('en dash only in INSTALL.md body is an error naming INSTALL.md', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true,
    installBody: goodInstallBody + '\nזה משפט עם מקף מפריד – בתוך הטקסט.',
  })
  assert.ok(r.errors.some(e => e.toLowerCase().includes('dash') && e.includes('INSTALL.md')))
})

test('dash inside an inline code span in INSTALL.md is not an error', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true,
    installBody: goodInstallBody + '\nהתו `—` הוא מקף מפריד.',
  })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('dash inside a fenced code block in INSTALL.md is not an error', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: true,
    installBody: goodInstallBody + '\n```\nדוגמה עם — בפנים הבלוק\n```\n',
  })
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})

test('dash in SKILL.md body names SKILL.md in the error, distinct from an INSTALL.md hit', () => {
  const r = validateSkill({
    dirName: 'hook-generator', data: goodData, body: goodBody + '\nזה משפט עם מקף מפריד — בתוך הטקסט.', hasInstall: true,
    installBody: goodInstallBody,
  })
  assert.ok(r.errors.some(e => e.toLowerCase().includes('dash') && e.includes('SKILL.md')))
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash') && e.includes('INSTALL.md')))
})

test('missing installBody (skill has no INSTALL.md) does not crash and reports only the missing-file error', () => {
  const r = validateSkill({ dirName: 'hook-generator', data: goodData, body: goodBody, hasInstall: false })
  assert.ok(r.errors.some(e => e.includes('INSTALL')))
  assert.ok(!r.errors.some(e => e.toLowerCase().includes('dash')))
})
