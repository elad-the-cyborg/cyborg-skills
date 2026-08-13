import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fillTemplate, toYamlStringList } from './lib/template.mjs'

// Usage: node scripts/new-skill.mjs name=hook-generator category_slug=02-copy-content \
//   category="קופי ותוכן" topic="הוקים וזוויות" title_he="מחולל הוקים הסייבורג" level=beginner \
//   one_liner="..." trigger="..." step1_title="..." example_prompt="..." \
//   summary_he="..." audience_he="..." \
//   what_it_does_he="פריט ראשון.|פריט שני.|פריט שלישי." how_it_helps_he="..." \
//   writes_files=false sends_external=false touches_live_campaigns=false [tags="..."]
//
// what_it_does_he is CLI-only: 3 to 5 items separated by "|" (a plain comma,
// like metadata.tags uses, would collide with commas inside a Hebrew
// sentence). It is rendered into the frontmatter as a real YAML block list,
// not a comma string, matching the contract validate-skill.mjs enforces.
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]
}))
for (const req of [
  'name', 'category_slug', 'category', 'topic', 'title_he', 'level',
  'one_liner', 'trigger', 'step1_title', 'example_prompt',
  'summary_he', 'audience_he', 'what_it_does_he', 'how_it_helps_he',
  'writes_files', 'sends_external', 'touches_live_campaigns',
]) {
  if (!args[req]) { console.error(`missing arg: ${req}`); process.exit(1) }
}
// safety flags must be literal YAML booleans, not arbitrary strings, since
// they get written unquoted into the frontmatter template.
for (const boolArg of ['writes_files', 'sends_external', 'touches_live_campaigns']) {
  if (args[boolArg] !== 'true' && args[boolArg] !== 'false') {
    console.error(`arg ${boolArg} must be exactly "true" or "false" (got: ${args[boolArg]}). Read the skill's own body before guessing.`)
    process.exit(1)
  }
}
// Same "first guess, verify after the body is written" spirit as the safety
// flags above: the scaffolder only checks shape (3 to 5 non-empty items),
// npm run validate checks content rules (length, dash ban, trigger phrase).
const whatItDoesItems = args.what_it_does_he.split('|').map(s => s.trim()).filter(Boolean)
if (whatItDoesItems.length < 3 || whatItDoesItems.length > 5) {
  console.error(`arg what_it_does_he must contain 3 to 5 items separated by "|" (got ${whatItDoesItems.length}). Read the skill's own body before guessing.`)
  process.exit(1)
}
const vars = { tags: '', ...args, what_it_does_he_yaml: toYamlStringList(whatItDoesItems) }
const dir = join(ROOT, 'skills', args.category_slug, args.name)
try { await access(dir); console.error(`already exists: ${dir}`); process.exit(1) } catch {}
await mkdir(dir, { recursive: true })
const skillTpl = await readFile(join(ROOT, 'templates/SKILL.md.template'), 'utf8')
const installTpl = await readFile(join(ROOT, 'templates/INSTALL.md.template'), 'utf8')
await writeFile(join(dir, 'SKILL.md'), fillTemplate(skillTpl, vars))
await writeFile(join(dir, 'INSTALL.md'), fillTemplate(installTpl, vars))
console.log(`Scaffolded ${args.name} at skills/${args.category_slug}/${args.name}`)
