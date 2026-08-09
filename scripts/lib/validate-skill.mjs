const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED = ['anthropic', 'claude']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const VISIBILITIES = ['public', 'booster']
const REQUIRED_META = [
  'title_he', 'category', 'category_slug', 'topic',
  'level', 'visibility', 'author', 'site', 'version',
]
const BRAND_MARKER = 'The Cyborg ·'
const DASH_CHARS = ['—', '–'] // em dash (U+2014) and en dash (U+2013)

// Safety denylist (warnings only): a skill body is read-only / draft-only by
// default, so these patterns flag anything that looks like it wants to touch
// the outside world for a human to review, never a hard failure.
const DENYLIST = [
  { re: /\brm\s+-rf\b/i, msg: 'destructive command found: "rm -rf"' },
  { re: /\bgit\s+push\b/i, msg: 'live "git push" instruction found' },
  { re: /\b(curl|fetch)\b[^\n]*https?:\/\//i, msg: 'network call to an external host found (curl/fetch)' },
  { re: /(שלח(י)?\s+(את\s+ה)?מייל|לשלוח\s+מייל|שלח(י)?\s+הודעה|send\s+(an\s+)?email|send\s+mail)/i, msg: 'instruction to send mail found' },
]

// Strip fenced code blocks and inline code spans before checking prose rules
// (like the em-dash ban), so a skill may quote a character inside code
// without tripping the rule that governs its own surrounding prose.
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
}

// One-letter Hebrew proclitics that glue straight onto the following word
// with no space (ו/ה/ב/ל/מ/ש/כ: "and/the/in/to/from/that/like"), e.g.
// "באקמה" ("in Acme") or "שאקמה" ("that Acme"). This is one of the most
// common constructions in Hebrew prose, so a marker preceded by one of
// these letters at a genuine word start must still match.
const HEBREW_PROCLITICS = 'והבלמשכ'

// Turns a plain-text marker (e.g. "acme method") into a case-insensitive,
// whitespace-tolerant regexp (matches "Acme  Method" too), anchored to
// whole words rather than any substring. Three things to know about how the
// anchoring actually behaves:
//
// 1. Plain \b is wrong for Hebrew. JavaScript's \b is defined over
//    [A-Za-z0-9_] only, so it treats every Hebrew letter as a non-word
//    character and can't be used here. Unicode-aware lookarounds (the "u"
//    flag, \p{L}, \p{N}) do the equivalent job for both scripts. The
//    trailing boundary is a plain negative lookahead: nothing may follow
//    the match except a non letter/digit/underscore, so a marker like
//    "blue harbor" doesn't fire on the longer word "harbors".
// 2. A single glued Hebrew proclitic is let through on purpose. The
//    trailing negative-lookahead pattern can't be mirrored on the leading
//    side, because that would treat a glued proclitic as an ordinary
//    adjacent letter and reject it, silently missing the single most
//    common way a Hebrew marker actually shows up attached to a noun. So
//    the leading side is a positive lookbehind with alternation: a real
//    word start (start of string, or any non letter/digit/underscore
//    character, which also covers a marker preceded by punctuation like a
//    hyphen or a maqaf) OR exactly one proclitic letter that is itself at
//    a real word start. A longer glued stem such as invented "פרואקמה"
//    still correctly fails to match: the letter right before the marker is
//    an ordinary letter, not a proclitic-at-word-start, so no alternative
//    applies.
// 3. Known, accepted limitation: a marker can match inside an unrelated
//    word that merely begins with one of the seven proclitic letters,
//    because nothing short of a full lexicon can tell a genuine glued
//    proclitic apart from a word's own first letter. Invented example:
//    marker "ורד" also matches inside the ordinary standalone word "מורד"
//    ("slope"), since word-initial מ looks identical to the proclitic מ
//    ("from"). This is accepted rather than chased with heuristics or a
//    word list, because this check is warnings-only and every warning is
//    read by a human before it means anything; recall matters more than
//    precision here.
function markerToRegExp(marker) {
  const escaped = marker.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replace(/\s+/g, '\\s+')
  const boundary = '[\\p{L}\\p{N}_]'
  const nonBoundary = '[^\\p{L}\\p{N}_]'
  const lead = `(?:^|${nonBoundary}|^[${HEBREW_PROCLITICS}]|${nonBoundary}[${HEBREW_PROCLITICS}])`
  return new RegExp(`(?<=${lead})${pattern}(?!${boundary})`, 'iu')
}

export function validateSkill({ dirName, data, body, hasInstall, catDirName, forbiddenMarkers = [] }) {
  const errors = []
  const warnings = []
  const name = data?.name

  if (!name || typeof name !== 'string' || !NAME_RE.test(name)) {
    errors.push(`name invalid (lowercase a-z, 0-9, hyphens only): ${name}`)
  } else {
    if (name.length > 64) errors.push('name exceeds 64 chars')
    if (RESERVED.some(w => name.includes(w))) errors.push(`name contains reserved word: ${name}`)
    if (name !== dirName) errors.push(`name "${name}" != directory "${dirName}"`)
  }

  const desc = data?.description
  if (!desc || !String(desc).trim()) errors.push('description is empty')
  else if (String(desc).length > 1024) errors.push('description exceeds 1024 chars')

  if (data?.license !== 'MIT') errors.push(`license must be MIT (got: ${data?.license})`)

  const meta = data?.metadata ?? {}
  for (const k of REQUIRED_META) {
    if (meta[k] === undefined || meta[k] === null || String(meta[k]).trim() === '') {
      errors.push(`metadata.${k} missing`)
    }
  }
  if (meta.level && !LEVELS.includes(meta.level)) errors.push(`metadata.level invalid: ${meta.level}`)
  if (meta.visibility && !VISIBILITIES.includes(meta.visibility)) errors.push(`metadata.visibility invalid: ${meta.visibility}`)
  if (catDirName !== undefined && meta.category_slug && meta.category_slug !== catDirName) {
    errors.push(`metadata.category_slug "${meta.category_slug}" does not match category directory "${catDirName}"`)
  }

  if (!body.includes(BRAND_MARKER)) errors.push('brand banner missing (expected "The Cyborg ·")')
  if (!/CLAUDE\.md/.test(body)) errors.push('no CLAUDE.md read step in body')
  if (!hasInstall) errors.push('INSTALL.md missing')

  const strippedBody = stripCode(body)
  for (const dash of DASH_CHARS) {
    if (strippedBody.includes(dash)) {
      errors.push(`dash (${dash}) found in body prose; rephrase with a comma, period or colon (em/en dash is allowed only in the frontmatter description)`)
    }
  }

  for (const marker of forbiddenMarkers) {
    // Defensive: an empty/whitespace-only marker would build an empty-
    // pattern regexp that matches every string. loadForbiddenMarkers()
    // already filters these out, but skip them here too so a caller
    // passing an array in directly (as tests and other code do) can't
    // trigger the same false-positive flood.
    if (!marker || !marker.trim()) continue
    if (markerToRegExp(marker).test(body)) warnings.push(`forbidden marker found (review for IP): "${marker}"`)
  }

  for (const { re, msg } of DENYLIST) {
    if (re.test(body)) warnings.push(`safety: ${msg}`)
  }

  return { errors, warnings }
}
