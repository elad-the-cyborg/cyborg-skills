import { readdir, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { validateSkill } from './lib/validate-skill.mjs'

const SKILLS_DIR = fileURLToPath(new URL('../skills/', import.meta.url))

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

if (!(await exists(SKILLS_DIR))) {
  console.log('No skills/ directory found. Nothing to validate.')
  process.exit(0)
}

let hadError = false
const seenNames = new Map() // skill name -> first path seen with that name

for await (const { dirName, path, catDirName } of skillDirs()) {
  const md = await readFile(join(path, 'SKILL.md'), 'utf8').catch(() => null)
  if (md === null) { console.error(`❌ ${dirName}: no SKILL.md`); hadError = true; continue }
  const { data, body } = parseFrontmatter(md)
  const hasInstall = await exists(join(path, 'INSTALL.md'))
  const { errors, warnings } = validateSkill({ dirName, data, body, hasInstall, catDirName })

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
process.exit(hadError ? 1 : 0)
