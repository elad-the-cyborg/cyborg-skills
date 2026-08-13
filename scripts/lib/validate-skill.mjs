const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED = ['anthropic', 'claude']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const VISIBILITIES = ['public', 'booster']
const REQUIRED_META = [
  'title_he', 'category', 'category_slug', 'topic',
  'level', 'visibility', 'author', 'site', 'version',
  'summary_he', 'audience_he', 'how_it_helps_he',
]
const BRAND_MARKER = 'The Cyborg ·'
const DASH_CHARS = ['—', '–'] // em dash (U+2014) and en dash (U+2013)

// metadata.safety: a small, honest object describing what the skill actually
// does, so the public site can render a per-skill safety sentence instead of
// one hardcoded promise that becomes false the moment a skill writes or
// sends something. Every key is required and must be a real boolean, and no
// extra keys are allowed (a typo here should fail loud, not silently pass).
const SAFETY_KEYS = ['writes_files', 'sends_external', 'touches_live_campaigns']

// metadata.site_gate: optional, and deliberately NOT in REQUIRED_META. Tells
// the public site whether to show this skill's install command openly or
// put a mailing-list email form in front of it first. Under the repo's
// current philosophy there are no access tiers and nothing here is secret,
// so the default must be open: a skill with the field missing or malformed
// has to render openly, never gated, so a mistake fails toward openness
// instead of toward a broken gate. That fail-open behavior lives in
// scripts/lib/catalog.mjs (only the exact string "gated" flips it); here we
// only flag an unrecognized value as a warning, for a human to notice and
// fix, never a hard error that blocks validation.
const SITE_GATE_VALUES = ['open', 'gated']

// summary_he/audience_he are customer-facing marketing copy, read by a
// non-technical business owner on the public site: no trigger phrasing
// ("הפעל כש..."), no implementation notes (CLAUDE.md), and no repeating the
// title that already sits right above it on the card.
const TRIGGER_PHRASE = 'הפעל כש'
const SUMMARY_MAX = 320
const AUDIENCE_MAX = 200

// what_it_does_he / how_it_helps_he are the two detail fields the public
// skill page renders below summary_he/audience_he, so a non-technical reader
// can decide whether to install a skill without opening SKILL.md: the
// concrete list of what happens, and a short paragraph on the business
// payoff. Same customer-facing rules as summary_he/audience_he (no dash, no
// trigger phrase, no CLAUDE.md), plus their own shape rules below.
const WHAT_IT_DOES_MIN_ITEMS = 3
const WHAT_IT_DOES_MAX_ITEMS = 5
const WHAT_IT_DOES_ITEM_MAX = 260
const HOW_IT_HELPS_MAX = 600

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
export function markerToRegExp(marker) {
  const escaped = marker.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replace(/\s+/g, '\\s+')
  const boundary = '[\\p{L}\\p{N}_]'
  const nonBoundary = '[^\\p{L}\\p{N}_]'
  const lead = `(?:^|${nonBoundary}|^[${HEBREW_PROCLITICS}]|${nonBoundary}[${HEBREW_PROCLITICS}])`
  return new RegExp(`(?<=${lead})${pattern}(?!${boundary})`, 'iu')
}

// Runs the dash ban against one file's body text and pushes a message that
// names the file, so a hit in SKILL.md and a hit in INSTALL.md never look
// like the same undifferentiated complaint. Code spans are stripped first
// (see stripCode) so a file may quote the character it forbids.
function checkDashBan(text, fileLabel, errors, note) {
  const stripped = stripCode(text ?? '')
  for (const dash of DASH_CHARS) {
    if (stripped.includes(dash)) {
      errors.push(`dash (${dash}) found in ${fileLabel} body prose; rephrase with a comma, period or colon${note ? ` (${note})` : ''}`)
    }
  }
}

// Runs the forbidden-marker denylist against one file's raw body text and
// pushes a warning that names the file, for the same reason as checkDashBan
// above. Unlike the dash ban this deliberately does NOT strip code spans:
// existing behavior for SKILL.md never did either, and a marker hiding
// inside a code span is still IP that needs a human's eyes.
function checkForbiddenMarkers(text, fileLabel, forbiddenMarkers, warnings) {
  for (const marker of forbiddenMarkers) {
    // Defensive: an empty/whitespace-only marker would build an empty-
    // pattern regexp that matches every string. loadForbiddenMarkers()
    // already filters these out, but skip them here too so a caller
    // passing an array in directly (as tests and other code do) can't
    // trigger the same false-positive flood.
    if (!marker || !marker.trim()) continue
    if (markerToRegExp(marker).test(text ?? '')) {
      warnings.push(`forbidden marker found in ${fileLabel} (review for IP): "${marker}"`)
    }
  }
}

export function validateSkill({ dirName, data, body, hasInstall, installBody = '', catDirName, forbiddenMarkers = [] }) {
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

  if (meta.summary_he !== undefined && meta.summary_he !== null && String(meta.summary_he).trim() !== '') {
    const summary = String(meta.summary_he)
    if (summary.length > SUMMARY_MAX) errors.push(`metadata.summary_he exceeds ${SUMMARY_MAX} chars`)
    if (meta.title_he && summary.includes(String(meta.title_he))) {
      errors.push('metadata.summary_he repeats metadata.title_he; say what the customer gets, not the title again')
    }
    if (summary.includes(TRIGGER_PHRASE)) {
      errors.push(`metadata.summary_he contains a trigger phrase ("${TRIGGER_PHRASE}"); that belongs in description for the model, not customer copy`)
    }
    if (/CLAUDE\.md/i.test(summary)) {
      errors.push('metadata.summary_he mentions CLAUDE.md; that is an implementation note, not customer copy')
    }
    for (const dash of DASH_CHARS) {
      if (summary.includes(dash)) errors.push(`metadata.summary_he contains a dash (${dash}); rephrase with a comma, period or colon`)
    }
  }

  if (meta.audience_he !== undefined && meta.audience_he !== null && String(meta.audience_he).trim() !== '') {
    const audience = String(meta.audience_he)
    if (audience.length > AUDIENCE_MAX) errors.push(`metadata.audience_he exceeds ${AUDIENCE_MAX} chars`)
    for (const dash of DASH_CHARS) {
      if (audience.includes(dash)) errors.push(`metadata.audience_he contains a dash (${dash}); rephrase with a comma, period or colon`)
    }
  }

  // metadata.what_it_does_he is a small array, not a plain string, so it
  // can't share REQUIRED_META's generic presence check (mirrors how
  // metadata.safety below gets its own dedicated block instead of being
  // folded into REQUIRED_META).
  if (meta.what_it_does_he === undefined || meta.what_it_does_he === null) {
    errors.push('metadata.what_it_does_he missing')
  } else if (!Array.isArray(meta.what_it_does_he)) {
    errors.push('metadata.what_it_does_he must be an array of strings, not a single string or object')
  } else {
    const items = meta.what_it_does_he
    if (items.length < WHAT_IT_DOES_MIN_ITEMS || items.length > WHAT_IT_DOES_MAX_ITEMS) {
      errors.push(`metadata.what_it_does_he must have between ${WHAT_IT_DOES_MIN_ITEMS} and ${WHAT_IT_DOES_MAX_ITEMS} items (got ${items.length})`)
    }
    items.forEach((item, i) => {
      if (typeof item !== 'string' || !item.trim()) {
        errors.push(`metadata.what_it_does_he[${i}] is empty`)
        return
      }
      if (item.length > WHAT_IT_DOES_ITEM_MAX) {
        errors.push(`metadata.what_it_does_he[${i}] exceeds ${WHAT_IT_DOES_ITEM_MAX} chars`)
      }
      if (item.includes(TRIGGER_PHRASE)) {
        errors.push(`metadata.what_it_does_he[${i}] contains a trigger phrase ("${TRIGGER_PHRASE}"); that belongs in description for the model, not customer copy`)
      }
      if (/CLAUDE\.md/i.test(item)) {
        errors.push(`metadata.what_it_does_he[${i}] mentions CLAUDE.md; that is an implementation note, not customer copy`)
      }
      for (const dash of DASH_CHARS) {
        if (item.includes(dash)) errors.push(`metadata.what_it_does_he[${i}] contains a dash (${dash}); rephrase with a comma, period or colon`)
      }
    })
  }

  if (meta.how_it_helps_he !== undefined && meta.how_it_helps_he !== null && String(meta.how_it_helps_he).trim() !== '') {
    if (typeof meta.how_it_helps_he !== 'string') {
      errors.push('metadata.how_it_helps_he must be a single string, not an array or object')
    } else {
      const howItHelps = meta.how_it_helps_he
      if (howItHelps.length > HOW_IT_HELPS_MAX) errors.push(`metadata.how_it_helps_he exceeds ${HOW_IT_HELPS_MAX} chars`)
      if (meta.title_he && howItHelps.includes(String(meta.title_he))) {
        errors.push('metadata.how_it_helps_he repeats metadata.title_he; say what changes for the owner, not the title again')
      }
      if (howItHelps.includes(TRIGGER_PHRASE)) {
        errors.push(`metadata.how_it_helps_he contains a trigger phrase ("${TRIGGER_PHRASE}"); that belongs in description for the model, not customer copy`)
      }
      if (/CLAUDE\.md/i.test(howItHelps)) {
        errors.push('metadata.how_it_helps_he mentions CLAUDE.md; that is an implementation note, not customer copy')
      }
      for (const dash of DASH_CHARS) {
        if (howItHelps.includes(dash)) errors.push(`metadata.how_it_helps_he contains a dash (${dash}); rephrase with a comma, period or colon`)
      }
    }
  }

  if (meta.safety === undefined || meta.safety === null || typeof meta.safety !== 'object' || Array.isArray(meta.safety)) {
    errors.push('metadata.safety missing or invalid (must be an object with writes_files, sends_external, touches_live_campaigns booleans)')
  } else {
    for (const k of SAFETY_KEYS) {
      if (typeof meta.safety[k] !== 'boolean') errors.push(`metadata.safety.${k} missing or not a boolean`)
    }
    const extra = Object.keys(meta.safety).filter(k => !SAFETY_KEYS.includes(k))
    if (extra.length) errors.push(`metadata.safety has unknown keys: ${extra.join(', ')}`)
  }

  if (meta.site_gate !== undefined && meta.site_gate !== null && String(meta.site_gate).trim() !== '') {
    if (!SITE_GATE_VALUES.includes(meta.site_gate)) {
      warnings.push(`metadata.site_gate has an unrecognized value ("${meta.site_gate}"); the site still renders this skill openly (fail-safe default), but the value should be "open" or "gated"`)
    }
  }

  if (!body.includes(BRAND_MARKER)) errors.push('brand banner missing (expected "The Cyborg ·")')
  if (!/CLAUDE\.md/.test(body)) errors.push('no CLAUDE.md read step in body')
  if (!hasInstall) errors.push('INSTALL.md missing')

  checkDashBan(body, 'SKILL.md', errors, 'em/en dash is allowed only in the frontmatter description')
  if (hasInstall) checkDashBan(installBody, 'INSTALL.md', errors)

  checkForbiddenMarkers(body, 'SKILL.md', forbiddenMarkers, warnings)
  if (hasInstall) checkForbiddenMarkers(installBody, 'INSTALL.md', forbiddenMarkers, warnings)

  for (const { re, msg } of DENYLIST) {
    if (re.test(body)) warnings.push(`safety: ${msg}`)
  }

  return { errors, warnings }
}
