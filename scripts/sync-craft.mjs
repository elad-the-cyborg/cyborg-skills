// Copies shared craft files from templates/craft/ into every skill that declares
// it needs them, so each skill folder stays self-contained.
//
// Why duplicate at all: a user installs ONE skill (npx degit .../skills/<cat>/<name>),
// not the repo. A shared file living at the repo root simply never arrives on their
// machine. The copy is the delivery mechanism.
//
// Why a script rather than copying by hand: six skills carrying six hand-edited
// copies of the same craft file drift apart within a month, and the drift is
// invisible because nothing compares them. templates/craft/ is the single source
// of truth; the copies are build output that happens to be committed.
//
// A skill opts in by listing filenames in metadata.craft in its SKILL.md
// frontmatter:
//
//   metadata:
//     craft: "hebrew-human-writing.md"        (or a comma-separated list)
//
// Usage:
//   node scripts/sync-craft.mjs          copy, report what changed
//   node scripts/sync-craft.mjs --check  exit 1 if any copy is stale (for CI)
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './lib/frontmatter.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const CRAFT_DIR = join(ROOT, 'templates', 'craft')
const SKILLS_DIR = join(ROOT, 'skills')
const checkOnly = process.argv.includes('--check')

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

const sources = new Map()
for (const f of await readdir(CRAFT_DIR)) {
  if (f.endsWith('.md')) sources.set(f, await readFile(join(CRAFT_DIR, f), 'utf8'))
}

let copied = 0
let stale = 0
let skipped = 0

for (const cat of await readdir(SKILLS_DIR, { withFileTypes: true })) {
  if (!cat.isDirectory()) continue
  for (const skill of await readdir(join(SKILLS_DIR, cat.name), { withFileTypes: true })) {
    if (!skill.isDirectory()) continue
    const skillPath = join(SKILLS_DIR, cat.name, skill.name)
    const skillFile = join(skillPath, 'SKILL.md')
    if (!await exists(skillFile)) continue

    const { data } = parseFrontmatter(await readFile(skillFile, 'utf8'))
    const declared = String(data?.metadata?.craft ?? '')
      .split(',').map(s => s.trim()).filter(Boolean)
    if (!declared.length) { skipped++; continue }

    for (const name of declared) {
      const src = sources.get(name)
      if (src === undefined) {
        console.error(`❌ ${skill.name}: declares craft "${name}" which does not exist in templates/craft/`)
        process.exitCode = 1
        continue
      }
      const dest = join(skillPath, 'references', name)
      const current = await exists(dest) ? await readFile(dest, 'utf8') : null
      if (current === src) continue

      if (checkOnly) {
        console.error(`❌ ${skill.name}/references/${name} is ${current === null ? 'missing' : 'stale'}`)
        stale++
        continue
      }
      await mkdir(join(skillPath, 'references'), { recursive: true })
      await writeFile(dest, src)
      console.log(`✅ ${skill.name}/references/${name}`)
      copied++
    }
  }
}

if (checkOnly) {
  if (stale) {
    console.error(`\n${stale} craft file(s) out of date. Run: npm run sync-craft`)
    process.exit(1)
  }
  console.log('✅ all craft copies match templates/craft/')
} else {
  console.log(`\nsynced ${copied} file(s); ${skipped} skill(s) declare no craft`)
}
