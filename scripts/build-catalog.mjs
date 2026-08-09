import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { buildCatalog } from './lib/catalog.mjs'
import { validateSkill } from './lib/validate-skill.mjs'

const run = promisify(execFile)
const ROOT = new URL('../', import.meta.url).pathname
const SKILLS_DIR = join(ROOT, 'skills')

async function exists(p) { try { await access(p); return true } catch { return false } }

async function gitUpdatedAt(path) {
  try {
    const { stdout } = await run('git', ['log', '-1', '--format=%cI', '--', path], { cwd: ROOT })
    return stdout.trim() || new Date().toISOString()
  } catch { return new Date().toISOString() }
}

const skills = []
const invalidSkills = []
const cats = await readdir(SKILLS_DIR, { withFileTypes: true })
for (const cat of cats.filter(d => d.isDirectory())) {
  const catPath = join(SKILLS_DIR, cat.name)
  const entries = await readdir(catPath, { withFileTypes: true })
  for (const s of entries.filter(d => d.isDirectory())) {
    const skPath = join(catPath, s.name)
    const md = await readFile(join(skPath, 'SKILL.md'), 'utf8').catch(() => null)
    if (!md) continue
    const { data, body } = parseFrontmatter(md)
    const hasInstall = await exists(join(skPath, 'INSTALL.md'))
    const validation = validateSkill({ dirName: s.name, data, body, hasInstall })
    if (validation.errors.length > 0) {
      invalidSkills.push({ skill: s.name, ...validation })
    } else {
      for (const warning of validation.warnings) {
        console.warn(`Warning: ${s.name}: ${warning}`)
      }
    }
    const updated_at = await gitUpdatedAt(join('skills', cat.name, s.name))
    skills.push({ data, updated_at })
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
