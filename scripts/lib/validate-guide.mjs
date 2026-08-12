// Validates a guides/<name>/GUIDE.md entry. Mirrors scripts/lib/validate-skill.mjs
// on purpose: same kind of frontmatter contract, same dash ban, same forbidden-
// marker scan, so a malformed guide fails as loudly as a malformed skill. The
// constants below intentionally duplicate a few of validate-skill.mjs's small,
// one-line ones (the name pattern, the reserved words, the dash characters) so
// the two validators stay independent for the simple stuff. The forbidden-
// marker matcher is different: it has real Hebrew-specific logic (proclitic
// handling, word-boundary lookarounds) with its own dedicated tests, so that
// one is imported rather than re-derived, to avoid a second, subtly different
// implementation of the same non-trivial regex.
import { markerToRegExp } from './validate-skill.mjs'

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
// A skill's name may not contain these, because a skill is invoked by name and a
// name like "claude-helper" reads as an official component. A guide is editorial
// writing ABOUT tools, so naming one after the tool it explains is ordinary
// descriptive use and belongs in the URL. Only the vendor name stays reserved.
const RESERVED = ['anthropic']
const DASH_CHARS = ['—', '–'] // em dash (U+2014) and en dash (U+2013)
const SUMMARY_MAX = 320

// A guide's frontmatter is deliberately flat (unlike a skill's nested
// `metadata` block): a guide has far fewer fields and no agent-facing
// `description` at all, since nothing invokes a guide the way an agent
// invokes a skill. See AUTHORING.md.
const REQUIRED_FIELDS = ['title_he', 'category', 'category_slug', 'summary_he']

function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
}

function checkDash(value, fieldName, errors) {
  if (typeof value !== 'string') return
  for (const dash of DASH_CHARS) {
    if (value.includes(dash)) errors.push(`${fieldName} contains a dash (${dash}); rephrase with a comma, period or colon`)
  }
}

export function validateGuide({ dirName, data, body, skillNames = [], forbiddenMarkers = [] }) {
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

  if (data?.license !== 'MIT') errors.push(`license must be MIT (got: ${data?.license})`)

  for (const field of REQUIRED_FIELDS) {
    if (data?.[field] === undefined || data?.[field] === null || String(data?.[field]).trim() === '') {
      errors.push(`${field} missing`)
    }
  }

  if (typeof data?.title_he === 'string') checkDash(data.title_he, 'title_he', errors)
  if (typeof data?.category === 'string') checkDash(data.category, 'category', errors)

  const summary = data?.summary_he
  if (typeof summary === 'string' && summary.trim() !== '') {
    if (summary.length > SUMMARY_MAX) errors.push(`summary_he exceeds ${SUMMARY_MAX} chars`)
    if (data.title_he && summary.includes(String(data.title_he))) {
      errors.push('summary_he repeats title_he; say what the reader gets, not the title again')
    }
    checkDash(summary, 'summary_he', errors)
  }

  // related_skill: required key (use an explicit null when the guide isn't
  // tied to any one skill), never just an absent key, so a guide can't
  // silently drop the field it was supposed to fill in.
  if (!('related_skill' in (data ?? {}))) {
    errors.push('related_skill missing (use null if this guide is not tied to a skill)')
  } else {
    const related = data.related_skill
    if (related !== null) {
      if (typeof related !== 'string' || !related.trim()) {
        errors.push('related_skill must be a skill name string or null')
      } else if (!skillNames.includes(related)) {
        errors.push(`related_skill "${related}" does not match any known skill name`)
      } else if (!body.includes(related)) {
        errors.push(`related_skill "${related}" is set but never mentioned in the body; the reader should be able to find the install step`)
      }
    }
  }

  const trimmedBody = typeof body === 'string' ? body.trim() : ''
  if (!trimmedBody) {
    errors.push('body is empty')
  } else if (!/^#\s+\S/m.test(trimmedBody)) {
    errors.push('body has no H1 heading (expected a line starting with "# ")')
  }

  const strippedBody = stripCode(body ?? '')
  for (const dash of DASH_CHARS) {
    if (strippedBody.includes(dash)) {
      errors.push(`dash (${dash}) found in body prose; rephrase with a comma, period or colon`)
    }
  }

  if (typeof body === 'string' && body.includes('/Users/')) {
    errors.push('body contains a literal /Users/ path; this repo is public, remove personal machine paths')
  }

  for (const marker of forbiddenMarkers) {
    if (!marker || !marker.trim()) continue
    if (markerToRegExp(marker).test(body ?? '')) warnings.push(`forbidden marker found (review for IP): "${marker}"`)
  }

  return { errors, warnings }
}
