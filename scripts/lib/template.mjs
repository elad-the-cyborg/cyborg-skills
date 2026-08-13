export function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? String(vars[k]) : `{{${k}}}`))
}

// Renders a plain string array as a YAML block list (double-quoted,
// backslash/quote-escaped), for splicing into a template via a token that
// sits alone on its own already-indented line, e.g.:
//   what_it_does_he:
//     {{what_it_does_he_yaml}}
// The token's own line already supplies the indent for the first item (the
// template text before the token), so only items after the first carry a
// baked-in leading indent, keeping every line of the resulting block
// visually aligned once substituted. Used by scripts/new-skill.mjs to
// scaffold metadata.what_it_does_he as a real array, not a comma string
// like metadata.tags (see AUTHORING.md).
export function toYamlStringList(items, indent = '    ') {
  return items
    .map((item, i) => `${i === 0 ? '' : indent}- "${String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join('\n')
}
