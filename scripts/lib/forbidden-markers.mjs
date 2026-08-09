import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const FILENAME = 'forbidden-markers.local.json'

// Reads the maintainer's private, git-ignored denylist of sources a skill
// must never be derived from. The file lives outside the repo history on
// purpose (see .gitignore), so this must never crash a validation run: a
// missing file is normal (no local markers configured), and a malformed
// file just gets skipped with a warning for a human to notice and fix.
export async function loadForbiddenMarkers(rootDir) {
  const path = join(rootDir, FILENAME)
  let raw
  try {
    raw = await readFile(path, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return []
    console.error(`Warning: could not read ${FILENAME}, ignoring it (${err.message}).`)
    return []
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.error(`Warning: ${FILENAME} is not valid JSON, ignoring it (${err.message}).`)
    return []
  }

  if (!Array.isArray(parsed) || !parsed.every(m => typeof m === 'string')) {
    console.error(`Warning: ${FILENAME} must be a JSON array of strings, ignoring it.`)
    return []
  }

  return parsed
}
