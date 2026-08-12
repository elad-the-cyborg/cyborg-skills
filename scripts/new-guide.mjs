import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fillTemplate } from './lib/template.mjs'

// Usage: node scripts/new-guide.mjs name=ad-hooks-in-20-minutes category_slug=02-copy-content \
//   category="קופי ותוכן" title_he="..." summary_he="..." related_skill=hook-generator
//
// related_skill is required, same as new-skill.mjs's safety flags: pass the
// literal word "null" (not quoted) when the guide isn't tied to any one
// skill, so a missing/forgotten value can't slip through as an accident.
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]
}))
for (const req of ['name', 'category_slug', 'category', 'title_he', 'summary_he', 'related_skill']) {
  if (!args[req]) { console.error(`missing arg: ${req}`); process.exit(1) }
}
// related_skill must render as a bare YAML scalar: either the literal word
// null, or a kebab-case skill name written unquoted. Reject anything else
// (spaces, quotes, uppercase) here rather than writing a frontmatter file
// that would only fail later in npm run validate.
if (args.related_skill !== 'null' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(args.related_skill)) {
  console.error(`arg related_skill must be exactly "null" or a lowercase kebab-case skill name (got: ${args.related_skill})`)
  process.exit(1)
}
const vars = { ...args }
const dir = join(ROOT, 'guides', args.name)
try { await access(dir); console.error(`already exists: ${dir}`); process.exit(1) } catch {}
await mkdir(dir, { recursive: true })
const guideTpl = await readFile(join(ROOT, 'templates/GUIDE.md.template'), 'utf8')
await writeFile(join(dir, 'GUIDE.md'), fillTemplate(guideTpl, vars))
console.log(`Scaffolded guide ${args.name} at guides/${args.name}`)
