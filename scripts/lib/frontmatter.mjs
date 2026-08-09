import YAML from 'yaml'

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export function parseFrontmatter(md) {
  const m = FM_RE.exec(md)
  if (!m) return { data: {}, body: md }
  const data = YAML.parse(m[1]) ?? {}
  return { data, body: m[2] }
}
