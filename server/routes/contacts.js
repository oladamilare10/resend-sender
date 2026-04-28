import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { readStore, writeStore, insertOne, updateOne, deleteOne } from '../utils/store.js'
import { validateEmail, validateEmailList } from '../utils/emailValidator.js'
import { parseFile } from '../utils/fileParser.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// GET /api/contacts
router.get('/', (req, res) => {
  const contacts = readStore('contacts')
  const { search, page = 1, limit = 50 } = req.query
  let filtered = contacts
  if (search) {
    const q = search.toLowerCase()
    filtered = contacts.filter(
      (c) => c.email.toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q)
    )
  }
  const total = filtered.length
  const start = (parseInt(page) - 1) * parseInt(limit)
  const items = filtered.slice(start, start + parseInt(limit))
  res.json({ items, total, page: parseInt(page), limit: parseInt(limit) })
})

// POST /api/contacts – add single contact
router.post('/', (req, res) => {
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })

  const { valid, reason } = validateEmail(email)
  if (!valid) return res.status(400).json({ error: reason })

  const contacts = readStore('contacts')
  const exists = contacts.find((c) => c.email.toLowerCase() === email.toLowerCase().trim())
  if (exists) return res.status(409).json({ error: 'Contact already exists' })

  const contact = insertOne('contacts', {
    id: uuidv4(),
    email: email.trim().toLowerCase(),
    name: (name || '').trim(),
    valid: true,
    createdAt: new Date().toISOString(),
  })
  res.status(201).json(contact)
})

// DELETE /api/contacts/:id
router.delete('/:id', (req, res) => {
  const deleted = deleteOne('contacts', req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  // Remove from segments too
  const segments = readStore('segments')
  segments.forEach((s) => {
    s.contactIds = (s.contactIds || []).filter((id) => id !== req.params.id)
  })
  writeStore('segments', segments)
  res.json({ success: true })
})

// DELETE /api/contacts (bulk)
router.delete('/', (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' })
  ids.forEach((id) => deleteOne('contacts', id))
  res.json({ success: true, deleted: ids.length })
})

// POST /api/contacts/upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const content = req.file.buffer.toString('utf8')
  const parsed = parseFile(req.file.originalname, content)
  const emails = parsed.map((p) => p.email)
  const validated = validateEmailList(emails)

  const contacts = readStore('contacts')
  const existingEmails = new Set(contacts.map((c) => c.email.toLowerCase()))

  const results = { added: 0, skipped: 0, invalid: 0, duplicates: 0, entries: [] }

  const toAdd = []
  validated.forEach((v, i) => {
    const name = parsed[i]?.name || ''
    if (!v.valid) {
      results.invalid++
      results.entries.push({ email: v.email, name, status: 'invalid', reason: v.reason })
      return
    }
    if (existingEmails.has(v.email.toLowerCase())) {
      results.duplicates++
      results.entries.push({ email: v.email, name, status: 'duplicate', reason: 'Already exists' })
      return
    }
    existingEmails.add(v.email.toLowerCase())
    toAdd.push({ id: uuidv4(), email: v.email.toLowerCase(), name, valid: true, createdAt: new Date().toISOString() })
    results.added++
    results.entries.push({ email: v.email, name, status: 'added', reason: null })
  })

  toAdd.forEach((c) => contacts.push(c))
  writeStore('contacts', contacts)

  res.json(results)
})

// POST /api/contacts/validate – validate without saving
router.post('/validate', (req, res) => {
  const { emails } = req.body
  if (!Array.isArray(emails)) return res.status(400).json({ error: 'emails array required' })
  res.json(validateEmailList(emails))
})

export default router
