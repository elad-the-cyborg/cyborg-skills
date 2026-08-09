import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadForbiddenMarkers } from '../scripts/lib/forbidden-markers.mjs'

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'cyborg-skills-forbidden-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('reads markers from forbidden-markers.local.json when present', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'forbidden-markers.local.json'), JSON.stringify(['שיטת אקמה', 'acme method']))
    const markers = await loadForbiddenMarkers(dir)
    assert.deepEqual(markers, ['שיטת אקמה', 'acme method'])
  })
})

test('returns an empty array when the file is absent', async () => {
  await withTempDir(async (dir) => {
    const markers = await loadForbiddenMarkers(dir)
    assert.deepEqual(markers, [])
  })
})

test('drops empty and whitespace-only entries but keeps real markers', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'forbidden-markers.local.json'), JSON.stringify(['', '   ', 'שיטת אקמה', 'acme method']))
    const markers = await loadForbiddenMarkers(dir)
    assert.deepEqual(markers, ['שיטת אקמה', 'acme method'])
  })
})

test('returns an empty array and warns once on malformed JSON', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'forbidden-markers.local.json'), '{ not valid json')
    const originalError = console.error
    const calls = []
    console.error = (...args) => calls.push(args)
    try {
      const markers = await loadForbiddenMarkers(dir)
      assert.deepEqual(markers, [])
      assert.equal(calls.length, 1)
    } finally {
      console.error = originalError
    }
  })
})
