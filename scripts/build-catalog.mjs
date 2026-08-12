import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { buildCatalog } from './lib/catalog.mjs'
import { validateSkill } from './lib/validate-skill.mjs'
import { validateGuide } from './lib/validate-guide.mjs'
import { validateLinks } from './lib/validate-links.mjs'
import { loadForbiddenMarkers } from './lib/forbidden-markers.mjs'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SKILLS_DIR = join(ROOT, 'skills')
const GUIDES_DIR = join(ROOT, 'guides')
const LINKS_FILE = join(ROOT, 'links', 'links.json')
const forbiddenMarkers = await loadForbiddenMarkers(ROOT)

async function exists(p) { try { await access(p); return true } catch { return false } }

async function gitUpdatedAt(path) {
  try {
    const { stdout } = await run('git', ['log', '-1', '--format=%cI', '--', path], { cwd: ROOT })
    const raw = stdout.trim()
    return raw ? new Date(raw).toISOString() : new Date().toISOString()
  } catch { return new Date().toISOString() }
}

if (!(await exists(SKILLS_DIR))) {
  console.error('No skills/ directory found. Cannot build a catalog.')
  process.exit(1)
}

const skills = []
const invalidSkills = []
const seenNames = new Map() // skill name -> first path seen with that name
const cats = await readdir(SKILLS_DIR, { withFileTypes: true })
for (const cat of cats.filter(d => d.isDirectory())) {
  const catPath = join(SKILLS_DIR, cat.name)
  const entries = await readdir(catPath, { withFileTypes: true })
  for (const s of entries.filter(d => d.isDirectory())) {
    const skPath = join(catPath, s.name)
    const md = await readFile(join(skPath, 'SKILL.md'), 'utf8').catch(() => null)
    if (!md) {
      invalidSkills.push({ skill: s.name, errors: ['no SKILL.md'], warnings: [] })
      continue
    }
    const { data, body } = parseFrontmatter(md)
    const installBody = await readFile(join(skPath, 'INSTALL.md'), 'utf8').catch(() => null)
    const hasInstall = installBody !== null
    const validation = validateSkill({ dirName: s.name, data, body, hasInstall, installBody, catDirName: cat.name, forbiddenMarkers })

    const name = data?.name
    if (name && typeof name === 'string') {
      if (seenNames.has(name)) {
        validation.errors.push(`duplicate skill name "${name}": also used by ${seenNames.get(name)}`)
      } else {
        seenNames.set(name, skPath)
      }
    }

    if (validation.errors.length > 0) {
      invalidSkills.push({ skill: s.name, ...validation })
    } else {
      for (const warning of validation.warnings) {
        console.warn(`Warning: ${s.name}: ${warning}`)
      }
      const updated_at = await gitUpdatedAt(join('skills', cat.name, s.name))
      skills.push({ data, updated_at })
    }
  }
}

// Guides may reference a skill by name (related_skill); checked against
// every skill name seen above, valid or not, same as the duplicate-name
// check does for skills themselves.
const skillNames = [...seenNames.keys()]

const guides = []
const invalidGuides = []
if (await exists(GUIDES_DIR)) {
  const guideDirs = await readdir(GUIDES_DIR, { withFileTypes: true })
  for (const g of guideDirs.filter(d => d.isDirectory())) {
    const gPath = join(GUIDES_DIR, g.name)
    const md = await readFile(join(gPath, 'GUIDE.md'), 'utf8').catch(() => null)
    if (!md) {
      invalidGuides.push({ guide: g.name, errors: ['no GUIDE.md'], warnings: [] })
      continue
    }
    const { data, body } = parseFrontmatter(md)
    const validation = validateGuide({ dirName: g.name, data, body, skillNames, forbiddenMarkers })

    if (validation.errors.length > 0) {
      invalidGuides.push({ guide: g.name, ...validation })
    } else {
      for (const warning of validation.warnings) {
        console.warn(`Warning: guide ${g.name}: ${warning}`)
      }
      const updated_at = await gitUpdatedAt(join('guides', g.name))
      guides.push({ data, updated_at })
    }
  }
}

let links = []
let linksError = null
if (await exists(LINKS_FILE)) {
  const raw = await readFile(LINKS_FILE, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    linksError = [`links/links.json is not valid JSON (${err.message})`]
  }
  if (!linksError) {
    const validation = validateLinks(parsed)
    for (const warning of validation.warnings) {
      console.warn(`Warning: links/links.json: ${warning}`)
    }
    if (validation.errors.length > 0) {
      linksError = validation.errors
    } else {
      links = parsed
    }
  }
}

if (invalidSkills.length > 0 || invalidGuides.length > 0 || linksError) {
  for (const { skill, errors } of invalidSkills) {
    console.error(`✖ ${skill}:`)
    for (const err of errors) console.error(`  - ${err}`)
  }
  for (const { guide, errors } of invalidGuides) {
    console.error(`✖ guide ${guide}:`)
    for (const err of errors) console.error(`  - ${err}`)
  }
  if (linksError) {
    console.error('✖ links/links.json:')
    for (const err of linksError) console.error(`  - ${err}`)
  }
  console.error('')
  console.error('Run `npm run validate` to check all skills, guides and links.')
  process.exit(1)
}

const { json, markdown } = buildCatalog(skills, guides, links, new Date().toISOString())
await writeFile(join(ROOT, 'catalog.json'), JSON.stringify(json, null, 2) + '\n')
await writeFile(join(ROOT, 'CATALOG.md'), markdown)
console.log(`Built catalog.json + CATALOG.md (${json.count} skills, ${json.guides.length} guides, ${json.links.length} links).`)
