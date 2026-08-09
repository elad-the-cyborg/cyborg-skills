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

export function renderCatalogMd(entries) {
  const lines = [
    '# קטלוג הסקילים · The Cyborg', '',
    '| קטגוריה | נושא | סקיל | רמה | התקנה |', '|---|---|---|---|---|',
  ]
  for (const e of entries) {
    lines.push(`| ${escapeCell(e.category)} | ${escapeCell(e.topic)} | [${escapeCell(e.title_he)}](${e.github_url}) | ${e.level} | \`${e.install_command}\` |`)
  }
  lines.push('')
  return lines.join('\n')
}
