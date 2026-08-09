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
const EM_DASH = '—'

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

export function validateSkill({ dirName, data, body, hasInstall, catDirName }) {
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

  if (stripCode(body).includes(EM_DASH)) {
    errors.push('em dash (—) found in body prose; rephrase with a comma, period or colon (em dash is allowed only in the frontmatter description)')
  }

  for (const re of FORBIDDEN) {
    if (re.test(body)) warnings.push(`forbidden marker found (review for IP): ${re}`)
  }

  for (const { re, msg } of DENYLIST) {
    if (re.test(body)) warnings.push(`safety: ${msg}`)
  }

  return { errors, warnings }
}
