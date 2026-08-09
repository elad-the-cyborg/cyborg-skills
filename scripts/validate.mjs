import { readdir, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { validateSkill } from './lib/validate-skill.mjs'

const SKILLS_DIR = new URL('../skills/', import.meta.url).pathname

async function exists(p) { try { await access(p); return true } catch { return false } }

async function* skillDirs() {
  const cats = await readdir(SKILLS_DIR, { withFileTypes: true })
  for (const cat of cats.filter(d => d.isDirectory())) {
    const catPath = join(SKILLS_DIR, cat.name)
    const skills = await readdir(catPath, { withFileTypes: true })
    for (const s of skills.filter(d => d.isDirectory())) {
      yield { dirName: s.name, path: join(catPath, s.name) }
    }
  }
}

let hadError = false
for await (const { dirName, path } of skillDirs()) {
  const md = await readFile(join(path, 'SKILL.md'), 'utf8').catch(() => null)
  if (md === null) { console.error(`❌ ${dirName}: no SKILL.md`); hadError = true; continue }
  const { data, body } = parseFrontmatter(md)
  const hasInstall = await exists(join(path, 'INSTALL.md'))
  const { errors, warnings } = validateSkill({ dirName, data, body, hasInstall })
  if (errors.length) { hadError = true; console.error(`❌ ${dirName}`); for (const e of errors) console.error(`   - ${e}`) }
  else console.log(`✅ ${dirName}`)
  for (const w of warnings) console.warn(`   ⚠️  ${dirName}: ${w}`)
}
process.exit(hadError ? 1 : 0)
