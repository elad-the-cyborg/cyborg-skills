import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { buildCatalog } from './lib/catalog.mjs'
import { validateSkill } from './lib/validate-skill.mjs'
import { loadForbiddenMarkers } from './lib/forbidden-markers.mjs'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SKILLS_DIR = join(ROOT, 'skills')
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
    const hasInstall = await exists(join(skPath, 'INSTALL.md'))
    const validation = validateSkill({ dirName: s.name, data, body, hasInstall, catDirName: cat.name, forbiddenMarkers })

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

if (invalidSkills.length > 0) {
  for (const { skill, errors } of invalidSkills) {
    console.error(`✖ ${skill}:`)
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
  }
  console.error('')
  console.error('Run `npm run validate` to check all skills.')
  process.exit(1)
}

const { json, markdown } = buildCatalog(skills, new Date().toISOString())
await writeFile(join(ROOT, 'catalog.json'), JSON.stringify(json, null, 2) + '\n')
await writeFile(join(ROOT, 'CATALOG.md'), markdown)
console.log(`Built catalog.json + CATALOG.md (${json.count} skills).`)
