import { readdir, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { validateSkill } from './lib/validate-skill.mjs'
import { validateGuide } from './lib/validate-guide.mjs'
import { validateLinks } from './lib/validate-links.mjs'
import { loadForbiddenMarkers } from './lib/forbidden-markers.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SKILLS_DIR = fileURLToPath(new URL('../skills/', import.meta.url))
const GUIDES_DIR = fileURLToPath(new URL('../guides/', import.meta.url))
const LINKS_FILE = fileURLToPath(new URL('../links/links.json', import.meta.url))
const forbiddenMarkers = await loadForbiddenMarkers(ROOT)

async function exists(p) { try { await access(p); return true } catch { return false } }

async function* skillDirs() {
  const cats = await readdir(SKILLS_DIR, { withFileTypes: true })
  for (const cat of cats.filter(d => d.isDirectory())) {
    const catPath = join(SKILLS_DIR, cat.name)
    const skills = await readdir(catPath, { withFileTypes: true })
    for (const s of skills.filter(d => d.isDirectory())) {
      yield { dirName: s.name, path: join(catPath, s.name), catDirName: cat.name }
    }
  }
}

async function* guideDirs() {
  const dirs = await readdir(GUIDES_DIR, { withFileTypes: true })
  for (const d of dirs.filter(d => d.isDirectory())) {
    yield { dirName: d.name, path: join(GUIDES_DIR, d.name) }
  }
}

let hadError = false
const seenNames = new Map() // skill name -> first path seen with that name

if (!(await exists(SKILLS_DIR))) {
  console.log('No skills/ directory found. Nothing to validate.')
} else {
  for await (const { dirName, path, catDirName } of skillDirs()) {
    const md = await readFile(join(path, 'SKILL.md'), 'utf8').catch(() => null)
    if (md === null) { console.error(`❌ ${dirName}: no SKILL.md`); hadError = true; continue }
    const { data, body } = parseFrontmatter(md)
    const hasInstall = await exists(join(path, 'INSTALL.md'))
    const { errors, warnings } = validateSkill({ dirName, data, body, hasInstall, catDirName, forbiddenMarkers })

    const name = data?.name
    if (name && typeof name === 'string') {
      if (seenNames.has(name)) {
        errors.push(`duplicate skill name "${name}": also used by ${seenNames.get(name)}`)
      } else {
        seenNames.set(name, path)
      }
    }

    if (errors.length) { hadError = true; console.error(`❌ ${dirName}`); for (const e of errors) console.error(`   - ${e}`) }
    else console.log(`✅ ${dirName}`)
    for (const w of warnings) console.warn(`   ⚠️  ${dirName}: ${w}`)
  }
}

// Guides may reference a skill by name (related_skill); validated against
// every skill name seen above, valid or not, the same way skill name
// duplicates are tracked regardless of that skill's own validity.
const skillNames = [...seenNames.keys()]

if (!(await exists(GUIDES_DIR))) {
  console.log('No guides/ directory found. Nothing to validate.')
} else {
  for await (const { dirName, path } of guideDirs()) {
    const md = await readFile(join(path, 'GUIDE.md'), 'utf8').catch(() => null)
    if (md === null) { console.error(`❌ guide ${dirName}: no GUIDE.md`); hadError = true; continue }
    const { data, body } = parseFrontmatter(md)
    const { errors, warnings } = validateGuide({ dirName, data, body, skillNames, forbiddenMarkers })

    if (errors.length) { hadError = true; console.error(`❌ guide ${dirName}`); for (const e of errors) console.error(`   - ${e}`) }
    else console.log(`✅ guide ${dirName}`)
    for (const w of warnings) console.warn(`   ⚠️  guide ${dirName}: ${w}`)
  }
}

if (!(await exists(LINKS_FILE))) {
  console.log('No links/links.json found. Nothing to validate.')
} else {
  const raw = await readFile(LINKS_FILE, 'utf8')
  let links
  try {
    links = JSON.parse(raw)
  } catch (err) {
    console.error(`❌ links/links.json: not valid JSON (${err.message})`)
    hadError = true
    links = null
  }
  if (links !== null) {
    const { errors, warnings } = validateLinks(links)
    if (errors.length) { hadError = true; console.error(`❌ links/links.json`); for (const e of errors) console.error(`   - ${e}`) }
    else console.log(`✅ links/links.json (${links.length} entries)`)
    for (const w of warnings) console.warn(`   ⚠️  links/links.json: ${w}`)
  }
}

process.exit(hadError ? 1 : 0)
