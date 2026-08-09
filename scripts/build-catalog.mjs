import { readdir, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseFrontmatter } from './lib/frontmatter.mjs'
import { buildCatalog } from './lib/catalog.mjs'

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
const cats = await readdir(SKILLS_DIR, { withFileTypes: true })
for (const cat of cats.filter(d => d.isDirectory())) {
  const catPath = join(SKILLS_DIR, cat.name)
  const entries = await readdir(catPath, { withFileTypes: true })
  for (const s of entries.filter(d => d.isDirectory())) {
    const skPath = join(catPath, s.name)
    const md = await readFile(join(skPath, 'SKILL.md'), 'utf8').catch(() => null)
    if (!md) continue
    const { data } = parseFrontmatter(md)
    const updated_at = await gitUpdatedAt(join('skills', cat.name, s.name))
    skills.push({ data, updated_at })
  }
}

const { json, markdown } = buildCatalog(skills, new Date().toISOString())
await writeFile(join(ROOT, 'catalog.json'), JSON.stringify(json, null, 2) + '\n')
await writeFile(join(ROOT, 'CATALOG.md'), markdown)
console.log(`Built catalog.json + CATALOG.md (${json.count} skills).`)
