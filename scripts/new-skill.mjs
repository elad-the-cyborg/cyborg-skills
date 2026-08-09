import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fillTemplate } from './lib/template.mjs'

// Usage: node scripts/new-skill.mjs name=hook-generator category_slug=02-copy-content \
//   category="קופי ותוכן" topic="הוקים וזוויות" title_he="מחולל הוקים הסייבורג" level=beginner \
//   one_liner="..." trigger="..." step1_title="..." example_prompt="..." [tags="..."]
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]
}))
for (const req of ['name', 'category_slug', 'category', 'topic', 'title_he', 'level', 'one_liner', 'trigger', 'step1_title', 'example_prompt']) {
  if (!args[req]) { console.error(`missing arg: ${req}`); process.exit(1) }
}
const vars = { tags: '', ...args }
const dir = join(ROOT, 'skills', args.category_slug, args.name)
try { await access(dir); console.error(`already exists: ${dir}`); process.exit(1) } catch {}
await mkdir(dir, { recursive: true })
const skillTpl = await readFile(join(ROOT, 'templates/SKILL.md.template'), 'utf8')
const installTpl = await readFile(join(ROOT, 'templates/INSTALL.md.template'), 'utf8')
await writeFile(join(dir, 'SKILL.md'), fillTemplate(skillTpl, vars))
await writeFile(join(dir, 'INSTALL.md'), fillTemplate(installTpl, vars))
console.log(`Scaffolded ${args.name} at skills/${args.category_slug}/${args.name}`)
