const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const RESERVED = ['anthropic', 'claude']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const VISIBILITIES = ['public', 'booster']
const REQUIRED_META = [
  'title_he', 'category', 'category_slug', 'topic',
  'level', 'visibility', 'author', 'site', 'version',
]
const BRAND_MARKER = 'The Cyborg ·'
const FORBIDDEN = [/\bacme\b/i, /אקמה/, /blue\s*harbor/i, /בלו\s*הרבור/]

export function validateSkill({ dirName, data, body, hasInstall }) {
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

  if (!body.includes(BRAND_MARKER)) errors.push('brand banner missing (expected "The Cyborg ·")')
  if (!/CLAUDE\.md/.test(body)) errors.push('no CLAUDE.md read step in body')
  if (!hasInstall) errors.push('INSTALL.md missing')

  for (const re of FORBIDDEN) {
    if (re.test(body)) warnings.push(`forbidden marker found (review for IP): ${re}`)
  }

  return { errors, warnings }
}
