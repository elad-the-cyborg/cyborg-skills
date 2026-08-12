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

// Guides and links are simpler than skills: a guide has no install
// command of its own (that lives on its related skill), and a link isn't
// installed at all, so neither gets the full deriveUrls() treatment.
export function deriveGuideUrls(name) {
  return {
    github_url: `https://github.com/${REPO}/blob/main/guides/${name}/GUIDE.md`,
  }
}

// A guide's frontmatter is already flat (see validate-guide.mjs), so this is
// mostly a pass-through plus the derived github_url/updated_at, the same
// pattern deriveUrls()/toCatalogEntry() use for skills.
export function toGuideCatalogEntry({ data, updated_at }) {
  return {
    name: data.name,
    title_he: data.title_he,
    summary_he: String(data.summary_he).trim(),
    category: data.category,
    category_slug: data.category_slug,
    related_skill: data.related_skill ?? null,
    // A guide may ask the site to single it out visually. Only an explicit
    // `true` counts, so a typo or a missing field renders as an ordinary guide
    // rather than shouting for attention. Reserved for the safety guide and
    // anything else a reader would be worse off skipping.
    highlight: data.highlight === true,
    ...deriveGuideUrls(data.name),
    updated_at,
  }
}

// A link has no derived fields at all (no install command, no repo URL): it
// points entirely outward, at a third-party tool. This just trims the
// customer-facing strings, the same hygiene toCatalogEntry() applies to a
// skill's description/summary_he/audience_he.
export function toLinkCatalogEntry(link) {
  return {
    name: link.name,
    title: String(link.title).trim(),
    url: link.url,
    summary_he: String(link.summary_he).trim(),
    group: link.group,
    pricing_he: String(link.pricing_he).trim(),
    hebrew_support: link.hebrew_support,
  }
}

export function buildCatalog(skills, guides, links, now) {
  const entries = skills
    .map(toCatalogEntry)
    .sort((x, y) => (x.category_slug + x.name).localeCompare(y.category_slug + y.name, 'en'))
  const guideEntries = guides
    .map(toGuideCatalogEntry)
    .sort((x, y) => x.name.localeCompare(y.name, 'en'))
  const linkEntries = links
    .map(toLinkCatalogEntry)
    .sort((x, y) => x.name.localeCompare(y.name, 'en'))
  const json = {
    version: '1.0', generated_at: now, count: entries.length,
    skills: entries, guides: guideEntries, links: linkEntries,
  }
  return { json, markdown: renderCatalogMd(entries, guideEntries, linkEntries) }
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

function heCountGuides(n) {
  if (n === 1) return 'מדריך אחד חי כרגע'
  return `${n} מדריכים חיים כרגע`
}

// Human-facing Hebrew labels for the link enums. Falls back to the raw
// value for anything not yet in the map, so a future group/support value
// the validator accepts still renders instead of silently disappearing.
const GROUP_LABELS_HE = { video: 'וידאו', text: 'טקסט וכתיבה' }
const HEBREW_SUPPORT_LABELS_HE = { full: 'מלאה', partial: 'חלקית', none: 'אין' }
function heLabel(map, value) { return map[value] ?? value }

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
export function renderCatalogMd(entries, guideEntries = [], linkEntries = []) {
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

  lines.push('## מדריכים', '')
  if (guideEntries.length === 0) {
    lines.push('אין עדיין מדריכים במאגר.', '')
  } else {
    lines.push(
      `${heCountGuides(guideEntries.length)}. כל מדריך הוא תוכן עריכתי בעברית שמלמד עבודה אמיתית, ` +
      'ולרוב מוביל להתקנת הסקיל שקשור אליו.',
      '',
    )
    lines.push('| מדריך | מה מקבלים | קטגוריה | סקיל קשור |', '|---|---|---|---|')
    for (const g of guideEntries) {
      const related = g.related_skill ? `\`${escapeCell(g.related_skill)}\`` : 'אין'
      lines.push(`| [${escapeCell(g.title_he)}](${g.github_url}) | ${escapeCell(g.summary_he)} | ${escapeCell(g.category)} | ${related} |`)
    }
    lines.push('')
  }

  lines.push('## כלים מומלצים', '')
  if (linkEntries.length === 0) {
    lines.push('הרשימה עוד ריקה, כלים מומלצים מתווספים בקרוב לאחר בדיקה ואישור.', '')
  } else {
    lines.push('| כלי | מה מקבלים | קבוצה | מחיר | תמיכה בעברית |', '|---|---|---|---|---|')
    for (const l of linkEntries) {
      lines.push(`| [${escapeCell(l.title)}](${l.url}) | ${escapeCell(l.summary_he)} | ${escapeCell(heLabel(GROUP_LABELS_HE, l.group))} | ${escapeCell(l.pricing_he)} | ${escapeCell(heLabel(HEBREW_SUPPORT_LABELS_HE, l.hebrew_support))} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
