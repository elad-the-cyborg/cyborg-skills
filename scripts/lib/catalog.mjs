const REPO = 'elad-the-cyborg/cyborg-skills'

export function deriveUrls(categorySlug, name) {
  const path = `skills/${categorySlug}/${name}`
  return {
    install_command: `npx degit ${REPO}/${path} ~/.claude/skills/${name}`,
    github_url: `https://github.com/${REPO}/tree/main/${path}`,
    install_guide_url: `https://github.com/${REPO}/blob/main/${path}/INSTALL.md`,
  }
}

export function toCatalogEntry({ data, updated_at }) {
  const m = data.metadata
  const tags = m.tags ? String(m.tags).split(',').map(s => s.trim()).filter(Boolean) : []
  return {
    name: data.name,
    title_he: m.title_he,
    category: m.category,
    category_slug: m.category_slug,
    topic: m.topic,
    description: String(data.description).trim(),
    summary_he: String(m.summary_he).trim(),
    audience_he: String(m.audience_he).trim(),
    safety: {
      writes_files: !!m.safety?.writes_files,
      sends_external: !!m.safety?.sends_external,
      touches_live_campaigns: !!m.safety?.touches_live_campaigns,
    },
    // Fail-open by construction: only the exact string "gated" ever gates a
    // skill on the public site. Missing, malformed, mistyped or non-string
    // values (undefined, "Gated", "email", true, ...) all render as "open".
    // See AUTHORING.md and scripts/lib/validate-skill.mjs.
    site_gate: m.site_gate === 'gated' ? 'gated' : 'open',
    level: m.level,
    visibility: m.visibility,
    tags,
    ...deriveUrls(m.category_slug, data.name),
    version: m.version,
    updated_at,
  }
}

export function buildCatalog(skills, now) {
  const entries = skills
    .map(toCatalogEntry)
    .sort((x, y) => (x.category_slug + x.name).localeCompare(y.category_slug + y.name, 'en'))
  const json = { version: '1.0', generated_at: now, count: entries.length, skills: entries }
  return { json, markdown: renderCatalogMd(entries) }
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|')
}

function heCountSkills(n) {
  if (n === 1) return 'סקיל אחד חי כרגע'
  return `${n} סקילים חיים כרגע`
}

function heCountCategories(n) {
  if (n === 1) return 'קטגוריה אחת'
  return `${n} קטגוריות`
}

// Renders the catalog as a table grouped under a "## category" heading per
// category, instead of one flat table with a repeated category column. This
// is the file a visitor lands on directly from GitHub, with no website
// involved: the heading per category lets them jump straight to a category
// (GitHub's own file-outline panel picks up "##" headings for free), and
// dropping the now-redundant category column narrows every row so the link
// and the install command sit closer together, without horizontal hunting.
// Entries are assumed already sorted by category_slug (buildCatalog does
// this), so grouping is a single pass with no re-sort.
//
// The install command is always rendered in full here, regardless of a
// skill's site_gate: that field only tells the *marketing site* whether to
// gate the command behind an email form. This repo is public and has no
// gating mechanism of its own, so the honest thing is to never pretend to
// gate something a visitor can already see in the skill's own SKILL.md two
// clicks away.
export function renderCatalogMd(entries) {
  const categoryCount = new Set(entries.map(e => e.category_slug)).size
  const lines = [
    '# קטלוג הסקילים · The Cyborg', '',
    `${heCountSkills(entries.length)}, פרוסים על פני ${heCountCategories(categoryCount)}. ` +
    'לכל סקיל יש כאן קישור לתיקייה בגיטהאב ופקודת התקנה מוכנה להעתקה. ' +
    'הפקודה גלויה תמיד בעמוד הזה, גם אם באתר השיווקי אותו סקיל מוצג מאחורי טופס מייל.',
    '',
  ]
  let currentSlug = null
  for (const e of entries) {
    if (e.category_slug !== currentSlug) {
      if (currentSlug !== null) lines.push('') // blank line between the previous table and the next heading
      currentSlug = e.category_slug
      lines.push(`## ${e.category}`, '')
      lines.push('| נושא | סקיל | מה מקבלים | למי מתאים | רמה | התקנה |', '|---|---|---|---|---|---|')
    }
    lines.push(`| ${escapeCell(e.topic)} | [${escapeCell(e.title_he)}](${e.github_url}) | ${escapeCell(e.summary_he)} | ${escapeCell(e.audience_he)} | ${e.level} | \`${e.install_command}\` |`)
  }
  lines.push('')
  return lines.join('\n')
}
