import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../data')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DEFAULTS = {
  campaigns: [],
  contacts: [],
  segments: [],
  emailLogs: [],
  settings: { apiKey: '', fromEmail: '', fromName: '', batchSize: 50, batchDelay: 1000 },
}

function filePath(key) {
  return path.join(DATA_DIR, `${key}.json`)
}

export function readStore(key) {
  const fp = filePath(key)
  if (!fs.existsSync(fp)) {
    const def = DEFAULTS[key]
    fs.writeFileSync(fp, JSON.stringify(def, null, 2))
    return structuredClone(def)
  }
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'))
  } catch {
    return structuredClone(DEFAULTS[key] ?? [])
  }
}

export function writeStore(key, data) {
  fs.writeFileSync(filePath(key), JSON.stringify(data, null, 2))
}

// Helpers
export function findById(key, id) {
  return readStore(key).find((item) => item.id === id) ?? null
}

export function insertOne(key, item) {
  const list = readStore(key)
  list.push(item)
  writeStore(key, list)
  return item
}

export function updateOne(key, id, patch) {
  const list = readStore(key)
  const idx = list.findIndex((i) => i.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...patch }
  writeStore(key, list)
  return list[idx]
}

export function deleteOne(key, id) {
  const list = readStore(key)
  const next = list.filter((i) => i.id !== id)
  writeStore(key, next)
  return next.length < list.length
}
