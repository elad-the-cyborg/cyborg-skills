// Validates links/links.json: the flat, curated list of recommended
// third-party tools. Unlike a skill or a guide, a link has no body prose and
// no directory of its own, so this validates one JS array of plain objects
// rather than a frontmatter + body pair. Mirrors validate-skill.mjs /
// validate-guide.mjs in spirit (same dash ban, same "fail loud on malformed
// shape" posture), duplicated rather than shared for the same reason those
// two stay independent of each other: these are small, stable constants.
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DASH_CHARS = ['—', '–'] // em dash (U+2014) and en dash (U+2013)
const GROUPS = ['video', 'text']
const HEBREW_SUPPORT_VALUES = ['full', 'partial', 'none']
const REQUIRED_FIELDS = ['name', 'title', 'url', 'summary_he', 'group', 'pricing_he', 'hebrew_support']
const SUMMARY_MAX = 320
const PRICING_MAX = 200

function checkDash(value, fieldName, label, errors) {
  if (typeof value !== 'string') return
  for (const dash of DASH_CHARS) {
    if (value.includes(dash)) errors.push(`link ${label}: ${fieldName} contains a dash (${dash}); rephrase with a comma, period or colon`)
  }
}

export function validateLinks(links) {
  const errors = []
  const warnings = []

  if (!Array.isArray(links)) {
    errors.push('links must be an array')
    return { errors, warnings }
  }

  const seenNames = new Map()

  links.forEach((link, i) => {
    const label = link?.name && typeof link.name === 'string' ? `"${link.name}"` : `#${i}`

    for (const field of REQUIRED_FIELDS) {
      if (link?.[field] === undefined || link?.[field] === null || String(link?.[field]).trim() === '') {
        errors.push(`link ${label}: ${field} missing`)
      }
    }

    if (typeof link?.name === 'string' && link.name.trim() !== '') {
      if (!NAME_RE.test(link.name)) {
        errors.push(`link ${label}: name invalid (lowercase a-z, 0-9, hyphens only): ${link.name}`)
      } else if (seenNames.has(link.name)) {
        errors.push(`link ${label}: duplicate name, also used by ${seenNames.get(link.name)}`)
      } else {
        seenNames.set(link.name, label)
      }
    }

    if (typeof link?.url === 'string' && link.url.trim() !== '') {
      let parsed
      try {
        parsed = new URL(link.url)
      } catch {
        errors.push(`link ${label}: url is not a valid absolute URL: ${link.url}`)
      }
      if (parsed && parsed.protocol !== 'https:') {
        errors.push(`link ${label}: url must be https (got "${parsed.protocol}"): ${link.url}`)
      }
    }

    if (link?.group !== undefined && link.group !== null && String(link.group).trim() !== '' && !GROUPS.includes(link.group)) {
      errors.push(`link ${label}: group invalid (got "${link.group}"), expected one of ${GROUPS.join(', ')}`)
    }

    if (link?.hebrew_support !== undefined && link.hebrew_support !== null && String(link.hebrew_support).trim() !== '' && !HEBREW_SUPPORT_VALUES.includes(link.hebrew_support)) {
      errors.push(`link ${label}: hebrew_support invalid (got "${link.hebrew_support}"), expected one of ${HEBREW_SUPPORT_VALUES.join(', ')}`)
    }

    if (typeof link?.summary_he === 'string' && link.summary_he.length > SUMMARY_MAX) {
      errors.push(`link ${label}: summary_he exceeds ${SUMMARY_MAX} chars`)
    }
    if (typeof link?.pricing_he === 'string' && link.pricing_he.length > PRICING_MAX) {
      errors.push(`link ${label}: pricing_he exceeds ${PRICING_MAX} chars`)
    }

    checkDash(link?.summary_he, 'summary_he', label, errors)
    checkDash(link?.pricing_he, 'pricing_he', label, errors)
  })

  return { errors, warnings }
}
